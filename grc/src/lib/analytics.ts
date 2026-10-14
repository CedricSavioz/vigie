import type { Loss } from '../types'
import { formatMonth } from './format'

/** Agrège les pertes sur les `months` derniers mois glissants (mois courant inclus). */
export function monthlyLosses(losses: Loss[], months = 12) {
  const now = new Date()
  const buckets = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1)
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: formatMonth(d), montant: 0, nombre: 0 }
  })
  const index = new Map(buckets.map((b) => [b.key, b]))
  for (const l of losses) {
    const b = index.get(l.date.slice(0, 7))
    if (b) {
      b.montant += l.amount
      b.nombre += 1
    }
  }
  return buckets
}

/** Pertes survenues sur les 12 derniers mois glissants. */
export function lossesLast12Months(losses: Loss[]) {
  const from = new Date()
  from.setFullYear(from.getFullYear() - 1)
  const iso = from.toISOString().slice(0, 10)
  return losses.filter((l) => l.date >= iso)
}
