import { useState, useMemo } from 'react'
import Chart from './Chart'
import {
  todayStr, getISOWeek, getWeekRange, getMonthRange,
  aggregateRecords, formatDurationShort, formatTime,
  downloadCSV,
} from '../utils'

export default function Report({ records, categories }) {
  const today = todayStr()
  const [reportType, setReportType] = useState('daily')
  const [date, setDate] = useState(today)
  const [week, setWeek] = useState(getISOWeek(today))
  const [month, setMonth] = useState(today.slice(0, 7))
  const [chartType, setChartType] = useState('bar')

  const { startDate, endDate, title } = useMemo(() => {
    if (reportType === 'daily') {
      return { startDate: date, endDate: date, title: `日別レポート：${date}` }
    } else if (reportType === 'weekly') {
      const range = getWeekRange(week)
      return {
        startDate: range.start,
        endDate: range.end,
        title: `週別レポート：${week}（${range.start} 〜 ${range.end}）`,
      }
    } else {
      const range = getMonthRange(month)
      return { startDate: range.start, endDate: range.end, title: `月別レポート：${month}` }
    }
  }, [reportType, date, week, month])

  const filtered = useMemo(
    () => records.filter(r => r.date >= startDate && r.date <= endDate),
    [records, startDate, endDate]
  )

  const aggregated = useMemo(
    () => aggregateRecords(filtered, categories),
    [filtered, categories]
  )

  const totalMs = aggregated.reduce((s, r) => s + r.duration, 0)

  function handleCSV() {
    if (filtered.length === 0) { alert('エクスポートするデータがありません。'); return }
    const catMap = Object.fromEntries(categories.map(c => [c.id, c]))
    const rows = [['大分類', '中分類', '日付', '開始時刻', '終了時刻', '時間（分）']]
    filtered
      .slice()
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .forEach(r => {
        const cat = catMap[r.categoryId]
        rows.push([
          cat?.major ?? '',
          cat?.minor ?? '',
          r.date,
          formatTime(r.startTime),
          formatTime(r.endTime),
          Math.round(r.duration / 60000),
        ])
      })
    const filename =
      reportType === 'daily' ? `qc_${date}.csv`
      : reportType === 'weekly' ? `qc_${week}.csv`
      : `qc_${month}.csv`
    downloadCSV(filename, rows)
  }

  const TYPE_BTNS = [
    { id: 'daily', label: '日別' },
    { id: 'weekly', label: '週別' },
    { id: 'monthly', label: '月別' },
  ]
  const CHART_BTNS = [
    { id: 'bar', label: '棒グラフ' },
    { id: 'pie', label: '円グラフ' },
  ]

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Type toggle */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden text-sm">
            {TYPE_BTNS.map(btn => (
              <button
                key={btn.id}
                onClick={() => setReportType(btn.id)}
                className={`px-4 py-2 font-medium transition-colors ${
                  reportType === btn.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Date picker */}
          <div className="flex items-center gap-2">
            {reportType === 'daily' && (
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            )}
            {reportType === 'weekly' && (
              <input type="week" value={week} onChange={e => setWeek(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            )}
            {reportType === 'monthly' && (
              <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            )}
          </div>

          <button
            onClick={handleCSV}
            className="flex items-center gap-1.5 text-sm border border-gray-300 hover:border-gray-400 text-gray-700 px-3 py-1.5 rounded-lg transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">{title}</h2>
        {aggregated.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">データがありません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">大分類</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">中分類</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">件数</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">合計時間</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">割合</th>
                </tr>
              </thead>
              <tbody>
                {aggregated.map((row, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-2 text-gray-800">{row.major}</td>
                    <td className="py-2 px-2 text-gray-800">{row.minor}</td>
                    <td className="py-2 px-2 text-right text-gray-600">{row.count}</td>
                    <td className="py-2 px-2 text-right font-medium tabular-nums text-gray-800">{formatDurationShort(row.duration)}</td>
                    <td className="py-2 px-2 text-right text-gray-600 tabular-nums">
                      {totalMs > 0 ? ((row.duration / totalMs) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-blue-50">
                  <td colSpan={2} className="py-2 px-2 font-semibold text-gray-800">合計</td>
                  <td className="py-2 px-2 text-right font-semibold text-gray-800">{filtered.length}</td>
                  <td className="py-2 px-2 text-right font-bold tabular-nums text-blue-700">{formatDurationShort(totalMs)}</td>
                  <td className="py-2 px-2 text-right font-semibold text-gray-800">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">グラフ</h2>
          <div className="flex border border-gray-200 rounded-lg overflow-hidden text-xs">
            {CHART_BTNS.map(btn => (
              <button
                key={btn.id}
                onClick={() => setChartType(btn.id)}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  chartType === btn.id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
        <Chart records={filtered} categories={categories} chartType={chartType} />
      </div>
    </div>
  )
}
