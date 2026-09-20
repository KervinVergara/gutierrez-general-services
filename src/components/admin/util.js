export function sanitizePhone(phone) {
  return (phone || '').replace(/\D/g, '')
}

export function money(n) {
  const v = Number(n) || 0
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function fmtDate(d) {
  if (!d) return '—'
  if (d.toDate) d = d.toDate()
  if (typeof d === 'string') d = new Date(d + 'T00:00:00')
  return d.toLocaleDateString('es-CO')
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function addDaysStr(baseStr, days) {
  const d = new Date(baseStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function addMonthsStr(baseStr, months) {
  const d = new Date(baseStr + 'T00:00:00')
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

const FREQ_DAYS = { weekly: 7, biweekly: 14, monthly: 30, bimonthly: 60, quarterly: 90 }
export function nextVisitFrom(dateStr, frequency) {
  if (frequency === 'monthly') return addMonthsStr(dateStr, 1)
  if (frequency === 'bimonthly') return addMonthsStr(dateStr, 2)
  if (frequency === 'quarterly') return addMonthsStr(dateStr, 3)
  return addDaysStr(dateStr, FREQ_DAYS[frequency] || 30)
}

export function daysUntil(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  const now = new Date(); now.setHours(0, 0, 0, 0)
  return Math.round((d - now) / 86400000)
}

export function monthKey(d) {
  if (d?.toDate) d = d.toDate()
  else if (typeof d === 'string') d = new Date(d + 'T00:00:00')
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(key) {
  const [y, m] = key.split('-')
  const names = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${names[Number(m) - 1]} ${y.slice(2)}`
}

export function last6Months() {
  const out = []
  const d = new Date()
  d.setDate(1)
  for (let i = 5; i >= 0; i--) {
    const dd = new Date(d.getFullYear(), d.getMonth() - i, 1)
    out.push(`${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}`)
  }
  return out
}
