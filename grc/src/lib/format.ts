const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const eurCompact = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  notation: 'compact',
  maximumFractionDigits: 1,
})
const num = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 })
const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
const monthFmt = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit' })

export const formatEur = (n: number) => eur.format(n)
export const formatEurCompact = (n: number) => eurCompact.format(n)
export const formatNumber = (n: number) => num.format(n)
export const formatDate = (iso: string) => (iso ? dateFmt.format(new Date(iso)) : '—')
export const formatMonth = (d: Date) => monthFmt.format(d).replace('.', '')

/** Date ISO (AAAA-MM-JJ) décalée de n jours par rapport à aujourd'hui. */
export function daysFromToday(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export function daysUntil(iso: string) {
  const ms = new Date(iso).getTime() - new Date(new Date().toISOString().slice(0, 10)).getTime()
  return Math.round(ms / 86_400_000)
}

/** Génère le prochain identifiant lisible d'une collection, ex. R-027. */
export function nextId(prefix: string, existing: { id: string }[]) {
  const max = existing.reduce((m, e) => {
    const match = e.id.match(new RegExp(`^${prefix}-(\\d+)$`))
    return match ? Math.max(m, Number(match[1])) : m
  }, 0)
  return `${prefix}-${String(max + 1).padStart(2, '0')}`
}
