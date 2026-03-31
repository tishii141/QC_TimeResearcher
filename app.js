'use strict';

/* =============================================
   Storage Module
   ============================================= */
const Storage = {
  KEYS: {
    categories: 'qc_categories',
    records: 'qc_records',
    timerSession: 'qc_timer_session',
  },
  load(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null');
    } catch (e) {
      return null;
    }
  },
  save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  },
  remove(key) {
    localStorage.removeItem(key);
  },
};

/* =============================================
   Utils Module
   ============================================= */
const Utils = {
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  },
  formatDuration(ms) {
    if (!ms || ms < 0) return '0:00:00';
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  },
  formatDurationShort(ms) {
    if (!ms || ms < 0) return '0分';
    const totalMin = Math.round(ms / 60000);
    if (totalMin < 60) return `${totalMin}分`;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m === 0 ? `${h}時間` : `${h}時間${m}分`;
  },
  toDateStr(d) {
    // Returns YYYY-MM-DD for a Date object (local time)
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },
  todayStr() {
    return Utils.toDateStr(new Date());
  },
  getISOWeek(dateStr) {
    // Returns "YYYY-Www" for a date string
    const d = new Date(dateStr + 'T00:00:00');
    const jan4 = new Date(Date.UTC(d.getFullYear(), 0, 4));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const startOfWeek1 = new Date(jan4);
    startOfWeek1.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1));
    const weekNum = Math.ceil((((d - startOfWeek1) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
  },
  getWeekRange(weekStr) {
    // weekStr: "YYYY-Www"  returns {start: "YYYY-MM-DD", end: "YYYY-MM-DD"}
    const parts = weekStr.split('-W');
    const year = parseInt(parts[0]);
    const week = parseInt(parts[1]);
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const startOfWeek1 = new Date(jan4);
    startOfWeek1.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1));
    const start = new Date(startOfWeek1);
    start.setUTCDate(startOfWeek1.getUTCDate() + (week - 1) * 7);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  },
  getMonthRange(monthStr) {
    // monthStr: "YYYY-MM" returns {start, end}
    const [y, m] = monthStr.split('-').map(Number);
    const start = `${monthStr}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${monthStr}-${String(lastDay).padStart(2, '0')}`;
    return { start, end };
  },
  groupBy(arr, key) {
    return arr.reduce((acc, item) => {
      const k = typeof key === 'function' ? key(item) : item[key];
      if (!acc[k]) acc[k] = [];
      acc[k].push(item);
      return acc;
    }, {});
  },
  formatTime(isoStr) {
    const d = new Date(isoStr);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  },
  // Distinct colors palette for chart
  COLORS: [
    '#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed',
    '#0891b2', '#be185d', '#65a30d', '#ea580c', '#6d28d9',
    '#0284c7', '#15803d', '#b91c1c', '#b45309', '#5b21b6',
  ],
};

/* =============================================
   App State
   ============================================= */
const AppState = {
  categories: [],
  records: [],
  timer: {
    running: false,
    categoryId: null,
    startTime: null,
    interval: null,
  },
  report: {
    type: 'daily', // daily | weekly | monthly
    date: Utils.todayStr(),
    week: Utils.getISOWeek(Utils.todayStr()),
    month: Utils.todayStr().slice(0, 7),
    chartType: 'bar', // bar | pie
  },
};

/* =============================================
   Category Manager
   ============================================= */
const CategoryManager = {
  load() {
    AppState.categories = Storage.load(Storage.KEYS.categories) || [];
  },
  save() {
    Storage.save(Storage.KEYS.categories, AppState.categories);
  },
  add(major, minor) {
    const cat = { id: Utils.uid(), major: major.trim(), minor: minor.trim() };
    AppState.categories.push(cat);
    this.save();
    return cat;
  },
  update(id, major, minor) {
    const cat = AppState.categories.find(c => c.id === id);
    if (!cat) return;
    cat.major = major.trim();
    cat.minor = minor.trim();
    this.save();
  },
  delete(id) {
    const inUse = AppState.records.some(r => r.categoryId === id);
    if (inUse) {
      alert('このカテゴリは記録に使用されているため削除できません。');
      return false;
    }
    AppState.categories = AppState.categories.filter(c => c.id !== id);
    this.save();
    return true;
  },
  getById(id) {
    return AppState.categories.find(c => c.id === id);
  },
  getMajors() {
    return [...new Set(AppState.categories.map(c => c.major))].sort();
  },
  getMinorsByMajor(major) {
    return AppState.categories.filter(c => c.major === major);
  },
  renderList() {
    const container = document.getElementById('category-list-container');
    if (AppState.categories.length === 0) {
      container.innerHTML = '<p class="empty-state">カテゴリが登録されていません</p>';
      return;
    }
    // Group by major
    const byMajor = Utils.groupBy(AppState.categories, 'major');
    let html = '<table class="data-table"><thead><tr><th>大分類</th><th>中分類</th><th>操作</th></tr></thead><tbody>';
    const majors = Object.keys(byMajor).sort();
    majors.forEach(major => {
      byMajor[major].forEach((cat, idx) => {
        html += `<tr>
          ${idx === 0 ? `<td rowspan="${byMajor[major].length}">${major}</td>` : ''}
          <td>${cat.minor}</td>
          <td class="action-cell">
            <button class="btn btn-secondary" onclick="CategoryManager.startEdit('${cat.id}')">編集</button>
            <button class="btn btn-danger" onclick="CategoryManager.confirmDelete('${cat.id}')">削除</button>
          </td>
        </tr>`;
      });
    });
    html += '</tbody></table>';
    container.innerHTML = html;
  },
  startEdit(id) {
    const cat = this.getById(id);
    if (!cat) return;
    document.getElementById('category-edit-id').value = id;
    document.getElementById('input-major').value = cat.major;
    document.getElementById('input-minor').value = cat.minor;
    document.getElementById('category-form-title').textContent = 'カテゴリを編集';
    document.getElementById('btn-category-save').textContent = '更新';
    document.getElementById('btn-category-cancel').style.display = 'inline-block';
    document.getElementById('input-major').focus();
  },
  resetForm() {
    document.getElementById('category-edit-id').value = '';
    document.getElementById('input-major').value = '';
    document.getElementById('input-minor').value = '';
    document.getElementById('category-form-title').textContent = 'カテゴリを追加';
    document.getElementById('btn-category-save').textContent = '追加';
    document.getElementById('btn-category-cancel').style.display = 'none';
  },
  confirmDelete(id) {
    const cat = this.getById(id);
    if (!cat) return;
    if (!confirm(`「${cat.major} / ${cat.minor}」を削除しますか？`)) return;
    if (this.delete(id)) {
      this.renderList();
      TimerModule.renderMajorSelect();
    }
  },
};

/* =============================================
   Record Manager
   ============================================= */
const RecordManager = {
  load() {
    AppState.records = Storage.load(Storage.KEYS.records) || [];
  },
  save() {
    Storage.save(Storage.KEYS.records, AppState.records);
  },
  add(categoryId, startTime, endTime) {
    const duration = new Date(endTime) - new Date(startTime);
    const record = {
      id: Utils.uid(),
      categoryId,
      date: Utils.toDateStr(new Date(startTime)),
      startTime,
      endTime,
      duration,
    };
    AppState.records.push(record);
    this.save();
    return record;
  },
  getByDateRange(startDate, endDate) {
    return AppState.records.filter(r => r.date >= startDate && r.date <= endDate);
  },
  renderTodayTable() {
    const container = document.getElementById('today-table-container');
    const today = Utils.todayStr();
    const records = AppState.records.filter(r => r.date === today);
    if (records.length === 0) {
      container.innerHTML = '<p class="empty-state">まだ記録がありません</p>';
      return;
    }
    let totalMs = 0;
    let html = '<table class="data-table"><thead><tr><th>開始</th><th>終了</th><th>大分類</th><th>中分類</th><th style="text-align:right">時間</th></tr></thead><tbody>';
    records.slice().sort((a, b) => a.startTime.localeCompare(b.startTime)).forEach(r => {
      const cat = CategoryManager.getById(r.categoryId);
      totalMs += r.duration;
      html += `<tr>
        <td>${Utils.formatTime(r.startTime)}</td>
        <td>${Utils.formatTime(r.endTime)}</td>
        <td>${cat ? cat.major : '?'}</td>
        <td>${cat ? cat.minor : '?'}</td>
        <td class="time-cell">${Utils.formatDurationShort(r.duration)}</td>
      </tr>`;
    });
    html += `</tbody><tfoot><tr class="total-row">
      <td colspan="4">合計</td>
      <td class="time-cell">${Utils.formatDurationShort(totalMs)}</td>
    </tr></tfoot></table>`;
    container.innerHTML = html;
  },
};

/* =============================================
   Timer Module
   ============================================= */
const TimerModule = {
  renderMajorSelect() {
    const sel = document.getElementById('select-major');
    const current = sel.value;
    sel.innerHTML = '<option value="">-- 選択してください --</option>';
    CategoryManager.getMajors().forEach(major => {
      const opt = document.createElement('option');
      opt.value = major;
      opt.textContent = major;
      sel.appendChild(opt);
    });
    if (current) sel.value = current;
    this.renderMinorSelect();
  },
  renderMinorSelect() {
    const majorSel = document.getElementById('select-major');
    const minorSel = document.getElementById('select-minor');
    const major = majorSel.value;
    minorSel.innerHTML = '<option value="">-- 選択してください --</option>';
    if (major) {
      minorSel.disabled = false;
      CategoryManager.getMinorsByMajor(major).forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.minor;
        minorSel.appendChild(opt);
      });
    } else {
      minorSel.disabled = true;
    }
  },
  start() {
    const minorSel = document.getElementById('select-minor');
    const categoryId = minorSel.value;
    if (!categoryId) {
      alert('カテゴリを選択してください。');
      return;
    }
    const startTime = new Date().toISOString();
    AppState.timer.running = true;
    AppState.timer.categoryId = categoryId;
    AppState.timer.startTime = startTime;

    // Persist for crash recovery
    Storage.save(Storage.KEYS.timerSession, { categoryId, startTime });

    document.getElementById('btn-start').disabled = true;
    document.getElementById('btn-stop').disabled = false;
    document.getElementById('select-major').disabled = true;
    document.getElementById('select-minor').disabled = true;

    const cat = CategoryManager.getById(categoryId);
    document.getElementById('timer-status').textContent =
      `計測中：${cat ? cat.major + ' / ' + cat.minor : ''}`;

    AppState.timer.interval = setInterval(() => this.tick(), 1000);
    this.tick();
  },
  tick() {
    const elapsed = Date.now() - new Date(AppState.timer.startTime).getTime();
    document.getElementById('elapsed-time').textContent = Utils.formatDuration(elapsed);
  },
  stop() {
    if (!AppState.timer.running) return;
    clearInterval(AppState.timer.interval);
    AppState.timer.interval = null;

    const endTime = new Date().toISOString();
    RecordManager.add(AppState.timer.categoryId, AppState.timer.startTime, endTime);
    Storage.remove(Storage.KEYS.timerSession);

    AppState.timer.running = false;
    AppState.timer.categoryId = null;
    AppState.timer.startTime = null;

    document.getElementById('elapsed-time').textContent = '00:00:00';
    document.getElementById('btn-start').disabled = false;
    document.getElementById('btn-stop').disabled = true;
    document.getElementById('select-major').disabled = false;
    document.getElementById('select-minor').disabled = document.getElementById('select-major').value === '';
    document.getElementById('timer-status').textContent = '記録しました。';

    RecordManager.renderTodayTable();

    setTimeout(() => {
      if (!AppState.timer.running) {
        document.getElementById('timer-status').textContent = '';
      }
    }, 3000);
  },
  checkCrashRecovery() {
    const session = Storage.load(Storage.KEYS.timerSession);
    if (!session) return;
    const cat = CategoryManager.getById(session.categoryId);
    const startStr = new Date(session.startTime).toLocaleString('ja-JP');
    const durationMs = Date.now() - new Date(session.startTime).getTime();
    const msg = `開始時刻：${startStr}\n経過時間：${Utils.formatDurationShort(durationMs)}\nカテゴリ：${cat ? cat.major + ' / ' + cat.minor : '不明'}`;
    document.getElementById('crash-modal-msg').textContent = msg;
    document.getElementById('crash-modal').style.display = 'block';
    document.getElementById('modal-overlay').style.display = 'block';

    document.getElementById('btn-crash-save').onclick = () => {
      RecordManager.add(session.categoryId, session.startTime, new Date().toISOString());
      Storage.remove(Storage.KEYS.timerSession);
      this.closeModal();
      RecordManager.renderTodayTable();
    };
    document.getElementById('btn-crash-discard').onclick = () => {
      Storage.remove(Storage.KEYS.timerSession);
      this.closeModal();
    };
  },
  closeModal() {
    document.getElementById('crash-modal').style.display = 'none';
    document.getElementById('modal-overlay').style.display = 'none';
  },
};

/* =============================================
   Report Module
   ============================================= */
const ReportModule = {
  render() {
    const { type } = AppState.report;
    let records = [];
    let title = '';
    let startDate, endDate;

    if (type === 'daily') {
      const d = AppState.report.date;
      startDate = d;
      endDate = d;
      title = `日別レポート：${d}`;
    } else if (type === 'weekly') {
      const range = Utils.getWeekRange(AppState.report.week);
      startDate = range.start;
      endDate = range.end;
      title = `週別レポート：${AppState.report.week}（${range.start} 〜 ${range.end}）`;
    } else {
      const range = Utils.getMonthRange(AppState.report.month);
      startDate = range.start;
      endDate = range.end;
      title = `月別レポート：${AppState.report.month}`;
    }

    records = RecordManager.getByDateRange(startDate, endDate);
    document.getElementById('report-title').textContent = title;
    this.renderTable(records);
    ChartModule.render(records);
  },

  renderTable(records) {
    const container = document.getElementById('report-table-container');
    if (records.length === 0) {
      container.innerHTML = '<p class="empty-state">データがありません</p>';
      return;
    }

    // Aggregate by category
    const agg = {};
    records.forEach(r => {
      const cat = CategoryManager.getById(r.categoryId);
      const key = r.categoryId;
      if (!agg[key]) {
        agg[key] = {
          major: cat ? cat.major : '?',
          minor: cat ? cat.minor : '?',
          count: 0,
          duration: 0,
        };
      }
      agg[key].count++;
      agg[key].duration += r.duration;
    });

    const rows = Object.values(agg).sort((a, b) => {
      if (a.major !== b.major) return a.major.localeCompare(b.major);
      return a.minor.localeCompare(b.minor);
    });

    const totalMs = rows.reduce((s, r) => s + r.duration, 0);

    let html = '<table class="data-table"><thead><tr><th>大分類</th><th>中分類</th><th>件数</th><th style="text-align:right">合計時間</th><th style="text-align:right">割合</th></tr></thead><tbody>';
    rows.forEach(row => {
      const pct = totalMs > 0 ? ((row.duration / totalMs) * 100).toFixed(1) : '0.0';
      html += `<tr>
        <td>${row.major}</td>
        <td>${row.minor}</td>
        <td>${row.count}</td>
        <td class="time-cell">${Utils.formatDurationShort(row.duration)}</td>
        <td class="time-cell">${pct}%</td>
      </tr>`;
    });
    html += `</tbody><tfoot><tr class="total-row">
      <td colspan="2">合計</td>
      <td>${records.length}</td>
      <td class="time-cell">${Utils.formatDurationShort(totalMs)}</td>
      <td class="time-cell">100%</td>
    </tr></tfoot></table>`;
    container.innerHTML = html;
  },
};

/* =============================================
   Chart Module
   ============================================= */
const ChartModule = {
  render(records) {
    const canvas = document.getElementById('report-chart');
    const ctx = canvas.getContext('2d');
    const { chartType } = AppState.report;

    // Aggregate
    const agg = {};
    records.forEach(r => {
      const cat = CategoryManager.getById(r.categoryId);
      const label = cat ? `${cat.major}/${cat.minor}` : '不明';
      agg[label] = (agg[label] || 0) + r.duration;
    });

    const labels = Object.keys(agg).sort();
    const values = labels.map(l => agg[l]);
    const colors = labels.map((_, i) => Utils.COLORS[i % Utils.COLORS.length]);

    if (labels.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#9ca3af';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('データがありません', canvas.width / 2, canvas.height / 2);
      document.getElementById('chart-legend').innerHTML = '';
      return;
    }

    if (chartType === 'bar') {
      this.drawBar(canvas, ctx, labels, values, colors);
    } else {
      this.drawPie(canvas, ctx, labels, values, colors);
    }

    this.renderLegend(labels, values, colors);
  },

  drawBar(canvas, ctx, labels, values, colors) {
    const maxVal = Math.max(...values);
    const padding = { top: 20, right: 20, bottom: 20, left: 160 };
    const barH = 32;
    const gap = 10;
    const totalH = padding.top + labels.length * (barH + gap) + padding.bottom;

    canvas.height = Math.max(totalH, 200);
    canvas.width = 800;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const chartW = canvas.width - padding.left - padding.right;

    labels.forEach((label, i) => {
      const y = padding.top + i * (barH + gap);
      const barW = maxVal > 0 ? (values[i] / maxVal) * chartW : 0;

      // Bar
      ctx.fillStyle = colors[i];
      ctx.fillRect(padding.left, y, barW, barH);

      // Label
      ctx.fillStyle = '#374151';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(label.length > 18 ? label.slice(0, 17) + '…' : label, padding.left - 6, y + barH / 2);

      // Value
      ctx.fillStyle = '#111827';
      ctx.textAlign = 'left';
      ctx.fillText(Utils.formatDurationShort(values[i]), padding.left + barW + 6, y + barH / 2);
    });
  },

  drawPie(canvas, ctx, labels, values, colors) {
    canvas.width = 800;
    canvas.height = 400;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const total = values.reduce((s, v) => s + v, 0);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = Math.min(cx, cy) - 40;

    let startAngle = -Math.PI / 2;
    values.forEach((val, i) => {
      const slice = (val / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, startAngle + slice);
      ctx.closePath();
      ctx.fillStyle = colors[i];
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label if slice is big enough
      const pct = (val / total) * 100;
      if (pct >= 5) {
        const midAngle = startAngle + slice / 2;
        const lx = cx + (r * 0.65) * Math.cos(midAngle);
        const ly = cy + (r * 0.65) * Math.sin(midAngle);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${pct.toFixed(1)}%`, lx, ly);
      }

      startAngle += slice;
    });
  },

  renderLegend(labels, values, colors) {
    const total = values.reduce((s, v) => s + v, 0);
    const legend = document.getElementById('chart-legend');
    legend.innerHTML = labels.map((label, i) => {
      const pct = total > 0 ? ((values[i] / total) * 100).toFixed(1) : '0.0';
      return `<div class="legend-item">
        <div class="legend-color" style="background:${colors[i]}"></div>
        <span>${label}（${Utils.formatDurationShort(values[i])}・${pct}%）</span>
      </div>`;
    }).join('');
  },
};

/* =============================================
   CSV Exporter
   ============================================= */
const CSVExporter = {
  export() {
    const { type } = AppState.report;
    let records = [];
    let filename = '';
    let startDate, endDate;

    if (type === 'daily') {
      startDate = endDate = AppState.report.date;
      filename = `qc_records_${AppState.report.date}.csv`;
    } else if (type === 'weekly') {
      const range = Utils.getWeekRange(AppState.report.week);
      startDate = range.start;
      endDate = range.end;
      filename = `qc_records_${AppState.report.week}.csv`;
    } else {
      const range = Utils.getMonthRange(AppState.report.month);
      startDate = range.start;
      endDate = range.end;
      filename = `qc_records_${AppState.report.month}.csv`;
    }

    records = RecordManager.getByDateRange(startDate, endDate);
    if (records.length === 0) {
      alert('エクスポートするデータがありません。');
      return;
    }

    const rows = [['大分類', '中分類', '日付', '開始時刻', '終了時刻', '時間（分）']];
    records.slice().sort((a, b) => a.startTime.localeCompare(b.startTime)).forEach(r => {
      const cat = CategoryManager.getById(r.categoryId);
      rows.push([
        cat ? cat.major : '',
        cat ? cat.minor : '',
        r.date,
        Utils.formatTime(r.startTime),
        Utils.formatTime(r.endTime),
        Math.round(r.duration / 60000),
      ]);
    });

    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

/* =============================================
   Tab Router
   ============================================= */
const TabRouter = {
  init() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.navigate(btn.dataset.tab);
      });
    });
    // Initial tab from hash
    const hash = location.hash.replace('#', '');
    if (['timer', 'report', 'category'].includes(hash)) {
      this.navigate(hash);
    }
  },
  navigate(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.tab-section').forEach(s => s.classList.toggle('active', s.id === `tab-${tab}`));
    location.hash = tab;
    if (tab === 'report') ReportModule.render();
    if (tab === 'timer') {
      TimerModule.renderMajorSelect();
      RecordManager.renderTodayTable();
    }
    if (tab === 'category') CategoryManager.renderList();
  },
};

/* =============================================
   App Init
   ============================================= */
const App = {
  init() {
    CategoryManager.load();
    RecordManager.load();

    // Tab navigation
    TabRouter.init();

    // Timer tab: selects
    document.getElementById('select-major').addEventListener('change', () => {
      TimerModule.renderMinorSelect();
    });
    document.getElementById('btn-start').addEventListener('click', () => TimerModule.start());
    document.getElementById('btn-stop').addEventListener('click', () => TimerModule.stop());

    // Report tab: type buttons
    document.querySelectorAll('.report-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        AppState.report.type = btn.dataset.type;
        document.querySelectorAll('.report-type-btn').forEach(b => b.classList.toggle('active', b === btn));
        // Toggle date pickers
        document.getElementById('report-date').style.display = btn.dataset.type === 'daily' ? '' : 'none';
        document.getElementById('report-week').style.display = btn.dataset.type === 'weekly' ? '' : 'none';
        document.getElementById('report-month').style.display = btn.dataset.type === 'monthly' ? '' : 'none';
        document.getElementById('report-date-label').textContent =
          btn.dataset.type === 'daily' ? '日付' :
          btn.dataset.type === 'weekly' ? '週' : '月';
        ReportModule.render();
      });
    });

    document.getElementById('report-date').value = AppState.report.date;
    document.getElementById('report-week').value = AppState.report.week;
    document.getElementById('report-month').value = AppState.report.month;

    document.getElementById('report-date').addEventListener('change', e => {
      AppState.report.date = e.target.value;
      ReportModule.render();
    });
    document.getElementById('report-week').addEventListener('change', e => {
      AppState.report.week = e.target.value;
      ReportModule.render();
    });
    document.getElementById('report-month').addEventListener('change', e => {
      AppState.report.month = e.target.value;
      ReportModule.render();
    });

    // Chart type toggle
    document.querySelectorAll('.chart-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        AppState.report.chartType = btn.dataset.chart;
        document.querySelectorAll('.chart-type-btn').forEach(b => b.classList.toggle('active', b === btn));
        ReportModule.render();
      });
    });

    // CSV export
    document.getElementById('btn-csv').addEventListener('click', () => CSVExporter.export());

    // Category form
    document.getElementById('category-form').addEventListener('submit', e => {
      e.preventDefault();
      const major = document.getElementById('input-major').value;
      const minor = document.getElementById('input-minor').value;
      const editId = document.getElementById('category-edit-id').value;
      if (editId) {
        CategoryManager.update(editId, major, minor);
      } else {
        CategoryManager.add(major, minor);
      }
      CategoryManager.resetForm();
      CategoryManager.renderList();
      TimerModule.renderMajorSelect();
    });

    document.getElementById('btn-category-cancel').addEventListener('click', () => {
      CategoryManager.resetForm();
    });

    // Initial render
    TimerModule.renderMajorSelect();
    RecordManager.renderTodayTable();

    // Crash recovery check
    TimerModule.checkCrashRecovery();
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
