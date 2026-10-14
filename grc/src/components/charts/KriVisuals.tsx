import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, YAxis } from 'recharts'
import { formatNumber } from '../../lib/format'
import { KRI_STYLE, kriStatus } from '../../lib/risk'
import type { Kri } from '../../types'

/** Mini-courbe de tendance des 12 dernières mesures, avec seuils en pointillés. */
export function Sparkline({ kri, height = 44, showThresholds = true }: { kri: Kri; height?: number; showThresholds?: boolean }) {
  const color = KRI_STYLE[kriStatus(kri)].hex
  const points = kri.history.map((v, i) => ({ i, v }))
  const all = [...kri.history, ...(showThresholds ? [kri.thresholdOrange, kri.thresholdRed] : [])]
  const min = Math.min(...all)
  const max = Math.max(...all)
  const pad = (max - min) * 0.12 || 1
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <YAxis hide domain={[min - pad, max + pad]} />
          {showThresholds && <ReferenceLine y={kri.thresholdOrange} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.7} />}
          {showThresholds && <ReferenceLine y={kri.thresholdRed} stroke="#dc2626" strokeDasharray="3 3" strokeOpacity={0.7} />}
          <Tooltip
            cursor={false}
            contentStyle={{ fontSize: 11, borderRadius: 8, padding: '4px 8px' }}
            labelFormatter={(i) => `Mesure M-${11 - Number(i)}`}
            formatter={(v) => [`${formatNumber(Number(v))} ${kri.unit}`, 'Valeur']}
          />
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * Jauge semi-circulaire : trois zones (vert / orange / rouge) bornées
 * par les seuils du KRI, et une aiguille positionnée sur la valeur.
 */
export function KriGauge({ kri, size = 150 }: { kri: Kri; size?: number }) {
  const status = kriStatus(kri)
  const asc = kri.direction === 'hausse_defavorable'
  const { thresholdOrange: o, thresholdRed: r } = kri
  const span = Math.abs(r - o) || Math.abs(o) * 0.2 || 1
  // Bornes de l'échelle : on encadre seuils et valeur avec une marge.
  let lo = asc ? Math.min(0, o - span * 2) : r - span * 1.5
  let hi = asc ? r + span * 1.5 : o + span * 2
  lo = Math.min(lo, kri.value, ...kri.history)
  hi = Math.max(hi, kri.value, ...kri.history)
  if (asc && lo < 0 && o >= 0) lo = 0

  const t = (v: number) => (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)
  const zones = asc
    ? [
        { from: 0, to: t(o), color: '#10b981' },
        { from: t(o), to: t(r), color: '#f59e0b' },
        { from: t(r), to: 1, color: '#dc2626' },
      ]
    : [
        { from: 0, to: t(r), color: '#dc2626' },
        { from: t(r), to: t(o), color: '#f59e0b' },
        { from: t(o), to: 1, color: '#10b981' },
      ]

  const w = size
  const h = size * 0.62
  const cx = w / 2
  const cy = h - 6
  const rad = w / 2 - 10
  const pt = (frac: number, radius = rad) => {
    const a = Math.PI * (1 - frac)
    return [cx + radius * Math.cos(a), cy - radius * Math.sin(a)]
  }
  const arc = (from: number, to: number) => {
    const [x1, y1] = pt(from)
    const [x2, y2] = pt(to)
    return `M ${x1} ${y1} A ${rad} ${rad} 0 0 1 ${x2} ${y2}`
  }
  const [nx, ny] = pt(t(kri.value), rad - 14)

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${kri.name} : ${kri.value} ${kri.unit}`}>
      <path d={arc(0, 1)} stroke="#f1f5f9" strokeWidth={12} fill="none" strokeLinecap="round" />
      {zones.map((z, i) => (
        <path key={i} d={arc(z.from, Math.max(z.from + 0.001, z.to))} stroke={z.color} strokeOpacity={0.85} strokeWidth={10} fill="none" />
      ))}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#0f172a" strokeWidth={2.5} strokeLinecap="round" style={{ transition: 'all 400ms ease' }} />
      <circle cx={cx} cy={cy} r={5} fill="#0f172a" />
      <circle cx={cx} cy={cy} r={2} fill={KRI_STYLE[status].hex} />
    </svg>
  )
}
