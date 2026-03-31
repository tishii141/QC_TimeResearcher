import { useState, useEffect, useRef } from 'react'
import { sb } from '../supabase'
import { uid, toDateStr, formatDuration, formatDurationShort, formatTime, todayStr } from '../utils'

const TIMER_KEY = 'qc_timer_session'

export default function Timer({ categories, user, onRecordAdded }) {
  const [selectedMajor, setSelectedMajor] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [running, setRunning] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [todayRecords, setTodayRecords] = useState([])
  const [statusMsg, setStatusMsg] = useState('')
  const [crashSession, setCrashSession] = useState(null)
  const intervalRef = useRef(null)

  const majors = [...new Set(categories.map(c => c.major))].sort()
  const minors = categories.filter(c => c.major === selectedMajor)

  // Load today's records from Supabase on mount
  useEffect(() => {
    loadTodayRecords()
    checkCrashRecovery()
  }, [])

  async function loadTodayRecords() {
    const today = todayStr()
    const { data, error } = await sb.from('records')
      .select('*')
      .eq('date', today)
      .order('start_time')
    if (error) { console.error(error); return }
    setTodayRecords(data.map(row => ({
      id: row.id,
      categoryId: row.category_id,
      date: row.date,
      startTime: row.start_time,
      endTime: row.end_time,
      duration: Number(row.duration),
    })))
  }

  function checkCrashRecovery() {
    try {
      const session = JSON.parse(localStorage.getItem(TIMER_KEY))
      if (session) setCrashSession(session)
    } catch {}
  }

  async function saveCrashSession(session, endTime) {
    const duration = new Date(endTime) - new Date(session.startTime)
    const id = uid()
    await sb.from('records').insert({
      id,
      user_id: user.id,
      category_id: session.categoryId,
      date: toDateStr(new Date(session.startTime)),
      start_time: session.startTime,
      end_time: endTime,
      duration,
    })
    localStorage.removeItem(TIMER_KEY)
    setCrashSession(null)
    loadTodayRecords()
    onRecordAdded()
  }

  function startTimer() {
    if (!selectedCategoryId) return
    const start = new Date().toISOString()
    setRunning(true)
    setStartTime(start)
    setElapsed(0)
    setStatusMsg('')
    localStorage.setItem(TIMER_KEY, JSON.stringify({ categoryId: selectedCategoryId, startTime: start }))
    intervalRef.current = setInterval(() => {
      setElapsed(Date.now() - new Date(start).getTime())
    }, 1000)
  }

  async function stopTimer() {
    clearInterval(intervalRef.current)
    const endTime = new Date().toISOString()
    setRunning(false)
    setElapsed(0)

    const id = uid()
    try {
      await sb.from('records').insert({
        id,
        user_id: user.id,
        category_id: selectedCategoryId,
        date: toDateStr(new Date(startTime)),
        start_time: startTime,
        end_time: endTime,
        duration: new Date(endTime) - new Date(startTime),
      })
      localStorage.removeItem(TIMER_KEY)
      setStatusMsg('記録しました ✓')
      loadTodayRecords()
      onRecordAdded()
      setTimeout(() => setStatusMsg(''), 3000)
    } catch (err) {
      setStatusMsg('保存に失敗しました: ' + err.message)
    }
  }

  useEffect(() => {
    return () => clearInterval(intervalRef.current)
  }, [])

  const selectedCat = categories.find(c => c.id === selectedCategoryId)
  const todayTotal = todayRecords.reduce((s, r) => s + r.duration, 0)
  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))

  return (
    <div className="space-y-4">
      {/* Crash Recovery Banner */}
      {crashSession && (() => {
        const cat = categories.find(c => c.id === crashSession.categoryId)
        const dur = Date.now() - new Date(crashSession.startTime).getTime()
        return (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-medium text-amber-800 mb-2">⚠️ 前回のセッションが中断されました</p>
            <p className="text-xs text-amber-700 mb-3">
              {cat ? `${cat.major} / ${cat.minor}` : '不明'} — {formatDurationShort(dur)}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => saveCrashSession(crashSession, new Date().toISOString())}
                className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg transition"
              >
                記録として保存
              </button>
              <button
                onClick={() => { localStorage.removeItem(TIMER_KEY); setCrashSession(null) }}
                className="text-xs border border-amber-300 text-amber-700 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition"
              >
                破棄
              </button>
            </div>
          </div>
        )
      })()}

      {/* Timer Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">計測</h2>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500 w-16 flex-shrink-0">大分類</label>
            <select
              value={selectedMajor}
              onChange={e => { setSelectedMajor(e.target.value); setSelectedCategoryId('') }}
              disabled={running}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">-- 選択してください --</option>
              {majors.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500 w-16 flex-shrink-0">中分類</label>
            <select
              value={selectedCategoryId}
              onChange={e => setSelectedCategoryId(e.target.value)}
              disabled={running || !selectedMajor}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">-- 選択してください --</option>
              {minors.map(c => <option key={c.id} value={c.id}>{c.minor}</option>)}
            </select>
          </div>
        </div>

        {/* Elapsed time display */}
        <div className="text-center mb-5">
          <div className={`text-6xl font-bold tabular-nums tracking-tight transition-colors ${running ? 'text-green-600' : 'text-gray-800'}`}>
            {formatDuration(elapsed)}
          </div>
          {running && selectedCat && (
            <p className="text-sm text-green-600 mt-2 font-medium">
              計測中：{selectedCat.major} / {selectedCat.minor}
            </p>
          )}
          {statusMsg && (
            <p className="text-sm text-blue-600 mt-2">{statusMsg}</p>
          )}
        </div>

        <div className="flex justify-center gap-3">
          {!running ? (
            <button
              onClick={startTimer}
              disabled={!selectedCategoryId}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-xl transition text-sm"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              開始
            </button>
          ) : (
            <button
              onClick={stopTimer}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-8 py-3 rounded-xl transition text-sm"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h12v12H6z" />
              </svg>
              停止
            </button>
          )}
        </div>
      </div>

      {/* Today's records */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">本日の記録</h2>
          {todayTotal > 0 && (
            <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              合計 {formatDurationShort(todayTotal)}
            </span>
          )}
        </div>
        {todayRecords.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">まだ記録がありません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">開始</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">終了</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">大分類</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">中分類</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">時間</th>
                </tr>
              </thead>
              <tbody>
                {todayRecords.map(r => {
                  const cat = catMap[r.categoryId]
                  return (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-2 text-gray-600">{formatTime(r.startTime)}</td>
                      <td className="py-2 px-2 text-gray-600">{formatTime(r.endTime)}</td>
                      <td className="py-2 px-2 text-gray-800">{cat?.major ?? '?'}</td>
                      <td className="py-2 px-2 text-gray-800">{cat?.minor ?? '?'}</td>
                      <td className="py-2 px-2 text-right font-medium text-gray-800 tabular-nums">{formatDurationShort(r.duration)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
