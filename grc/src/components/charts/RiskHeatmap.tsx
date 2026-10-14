import clsx from 'clsx'
import { Fragment } from 'react'
import { IMPACT_SCALE, PROBABILITY_SCALE } from '../../lib/labels'
import { heatColor, scoreToCriticality } from '../../lib/risk'
import type { Risk } from '../../types'

export type HeatMode = 'residuel' | 'intrinseque'
export type HeatCell = { p: number; i: number }

const coords = (r: Risk, mode: HeatMode) =>
  mode === 'residuel' ? { p: r.residualProbability, i: r.residualImpact } : { p: r.probability, i: r.impact }

/**
 * Matrice probabilité (lignes) × impact (colonnes), 5 × 5.
 * Chaque case affiche le nombre de risques et est cliquable.
 */
export function RiskHeatmap({
  risks,
  mode,
  selected,
  onSelect,
  compact,
}: {
  risks: Risk[]
  mode: HeatMode
  selected?: HeatCell | null
  onSelect?: (cell: HeatCell | null) => void
  compact?: boolean
}) {
  const counts = new Map<string, Risk[]>()
  for (const r of risks) {
    const { p, i } = coords(r, mode)
    const k = `${p}-${i}`
    counts.set(k, [...(counts.get(k) ?? []), r])
  }
  const cell = compact ? 'h-9' : 'h-14'

  return (
    <div className="flex gap-2">
      <div className="flex items-center">
        <span className="-rotate-180 text-[11px] font-medium tracking-wide text-slate-500 uppercase [writing-mode:vertical-rl]">
          Probabilité
        </span>
      </div>
      <div className="flex-1">
        <div className="grid grid-cols-[auto_repeat(5,1fr)] gap-1">
          {[5, 4, 3, 2, 1].map((p) => (
            <Fragment key={p}>
              <div className="flex items-center justify-end pr-1.5 text-[11px] text-slate-500" title={PROBABILITY_SCALE[p]}>
                <span className="hidden xl:inline">{PROBABILITY_SCALE[p]}</span>
                <span className="ml-1 font-semibold text-slate-700">{p}</span>
              </div>
              {[1, 2, 3, 4, 5].map((i) => {
                const list = counts.get(`${p}-${i}`) ?? []
                const score = p * i
                const isSel = selected?.p === p && selected?.i === i
                const crit = scoreToCriticality(score)
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!onSelect}
                    onClick={() => onSelect?.(isSel ? null : { p, i })}
                    aria-label={`Probabilité ${p}, impact ${i} : ${list.length} risque(s)`}
                    title={list.map((r) => `${r.id} — ${r.name}`).join('\n') || 'Aucun risque'}
                    className={clsx(
                      cell,
                      'relative flex items-center justify-center rounded-md text-sm font-semibold transition-all enabled:cursor-pointer enabled:hover:scale-[1.04] enabled:hover:shadow-md',
                      isSel && 'z-10 scale-[1.06] shadow-lg ring-2 ring-brand-900 ring-offset-1',
                      selected && !isSel && 'opacity-50',
                    )}
                    style={{
                      backgroundColor: heatColor(score),
                      color: crit === 'L' ? '#065f46' : crit === 'M' ? '#78350f' : '#fff',
                    }}
                  >
                    {list.length > 0 ? (
                      <span className="flex size-7 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-sm tabular-nums">
                        {list.length}
                      </span>
                    ) : (
                      <span className="text-[10px] opacity-40">{score}</span>
                    )}
                  </button>
                )
              })}
            </Fragment>
          ))}
          <div />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="pt-1 text-center text-[11px] text-slate-500" title={IMPACT_SCALE[i]}>
              <span className="font-semibold text-slate-700">{i}</span>
              {!compact && <span className="hidden xl:block">{IMPACT_SCALE[i]}</span>}
            </div>
          ))}
        </div>
        <p className="mt-1 text-center text-[11px] font-medium tracking-wide text-slate-500 uppercase">Impact</p>
      </div>
    </div>
  )
}

export function risksInCell(risks: Risk[], mode: HeatMode, cell: HeatCell) {
  return risks.filter((r) => {
    const c = coords(r, mode)
    return c.p === cell.p && c.i === cell.i
  })
}
