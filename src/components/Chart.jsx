import { useRef, useEffect } from 'react'
import { COLORS, formatDurationShort } from '../utils'

export default function Chart({ records, categories, chartType }) {
  const canvasRef = useRef(null)

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))

  // Aggregate
  const agg = {}
  records.forEach(r => {
    const cat = catMap[r.categoryId]
    const label = cat ? `${cat.major}/${cat.minor}` : '不明'
    agg[label] = (agg[label] || 0) + r.duration
  })
  const labels = Object.keys(agg).sort()
  const values = labels.map(l => agg[l])
  const colors = labels.map((_, i) => COLORS[i % COLORS.length])
  const total = values.reduce((s, v) => s + v, 0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    if (labels.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#9ca3af'
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('データがありません', canvas.width / 2, canvas.height / 2)
      return
    }

    if (chartType === 'bar') drawBar(canvas, ctx)
    else drawPie(canvas, ctx)
  }, [records, chartType, categories])

  function drawBar(canvas, ctx) {
    const pad = { top: 16, right: 16, bottom: 16, left: 180 }
    const barH = 28, gap = 8
    const totalH = pad.top + labels.length * (barH + gap) + pad.bottom
    canvas.height = Math.max(totalH, 120)
    canvas.width = canvas.parentElement?.clientWidth || 700
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const chartW = canvas.width - pad.left - pad.right
    const maxVal = Math.max(...values)

    labels.forEach((label, i) => {
      const y = pad.top + i * (barH + gap)
      const barW = maxVal > 0 ? (values[i] / maxVal) * chartW : 0

      // Bar with rounded right edge approximation
      ctx.fillStyle = colors[i]
      ctx.beginPath()
      ctx.roundRect(pad.left, y, Math.max(barW, 2), barH, [0, 4, 4, 0])
      ctx.fill()

      // Label
      ctx.fillStyle = '#374151'
      ctx.font = '12px "Hiragino Kaku Gothic ProN", sans-serif'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      const shortLabel = label.length > 20 ? label.slice(0, 19) + '…' : label
      ctx.fillText(shortLabel, pad.left - 8, y + barH / 2)

      // Value
      ctx.fillStyle = '#111827'
      ctx.textAlign = 'left'
      ctx.fillText(formatDurationShort(values[i]), pad.left + barW + 6, y + barH / 2)
    })
  }

  function drawPie(canvas, ctx) {
    canvas.width = canvas.parentElement?.clientWidth || 700
    canvas.height = 320
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const cx = canvas.width / 2
    const cy = canvas.height / 2
    const r = Math.min(cx, cy) - 30

    let startAngle = -Math.PI / 2
    values.forEach((val, i) => {
      const slice = (val / total) * 2 * Math.PI
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, startAngle, startAngle + slice)
      ctx.closePath()
      ctx.fillStyle = colors[i]
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()

      const pct = (val / total) * 100
      if (pct >= 5) {
        const mid = startAngle + slice / 2
        const lx = cx + r * 0.65 * Math.cos(mid)
        const ly = cy + r * 0.65 * Math.sin(mid)
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 11px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${pct.toFixed(1)}%`, lx, ly)
      }
      startAngle += slice
    })
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <canvas ref={canvasRef} className="w-full" />
      </div>
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4">
          {labels.map((label, i) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-gray-600">
              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: colors[i] }} />
              <span>{label}（{formatDurationShort(values[i])}・{total > 0 ? ((values[i] / total) * 100).toFixed(1) : 0}%）</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
