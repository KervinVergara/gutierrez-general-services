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
