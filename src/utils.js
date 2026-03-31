export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export function toDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayStr() {
  return toDateStr(new Date())
}

export function formatDuration(ms) {
  if (!ms || ms < 0) return '0:00:00'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatDurationShort(ms) {
  if (!ms || ms < 0) return '0分'
  const totalMin = Math.round(ms / 60000)
  if (totalMin < 60) return `${totalMin}分`
  const h = Math.floor(totalMin / 60)
  const rem = totalMin % 60
  return rem === 0 ? `${h}時間` : `${h}時間${rem}分`
}

export function formatTime(isoStr) {
  const d = new Date(isoStr)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function getISOWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const jan4 = new Date(Date.UTC(d.getFullYear(), 0, 4))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1))
  const weekNum = Math.ceil((((d - startOfWeek1) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

export function getWeekRange(weekStr) {
  const [yearStr, weekPart] = weekStr.split('-W')
  const year = parseInt(yearStr)
  const week = parseInt(weekPart)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1))
  const start = new Date(startOfWeek1)
  start.setUTCDate(startOfWeek1.getUTCDate() + (week - 1) * 7)
  const end = new Date(start)
  end.setUTCDate(start.getUTCDate() + 6)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

export function getMonthRange(monthStr) {
  const [y, m] = monthStr.split('-').map(Number)
  const start = `${monthStr}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const end = `${monthStr}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

export const COLORS = [
  '#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed',
  '#0891b2', '#be185d', '#65a30d', '#ea580c', '#6d28d9',
  '#0284c7', '#15803d', '#b91c1c', '#b45309', '#5b21b6',
]

export function groupByMajor(categories) {
  return categories.reduce((acc, cat) => {
    if (!acc[cat.major]) acc[cat.major] = []
    acc[cat.major].push(cat)
    return acc
  }, {})
}

export function aggregateRecords(records, categories) {
  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))
  const agg = {}
  records.forEach(r => {
    if (!agg[r.categoryId]) {
      const cat = catMap[r.categoryId]
      agg[r.categoryId] = {
        major: cat?.major ?? '?',
        minor: cat?.minor ?? '?',
        count: 0,
        duration: 0,
      }
    }
    agg[r.categoryId].count++
    agg[r.categoryId].duration += r.duration
  })
  return Object.values(agg).sort((a, b) =>
    a.major.localeCompare(b.major) || a.minor.localeCompare(b.minor)
  )
}

export function downloadCSV(filename, rows) {
  const BOM = '\uFEFF'
  const csv = BOM + rows
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
