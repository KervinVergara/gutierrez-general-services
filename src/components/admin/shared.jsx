export function FilterBtn({ active, children, ...p }) {
  return <button {...p} className={`h-10 px-4 rounded-full text-sm font-semibold border ${active ? 'bg-ink text-gold border-ink' : 'bg-white border-ink/15 hover:border-ink'}`}>{children}</button>
}

export function TabBtn({ active, children, ...p }) {
  return <button {...p} className={`h-11 px-4 text-sm font-bold border-b-2 -mb-px whitespace-nowrap ${active ? 'border-ink text-ink' : 'border-transparent text-ink/50 hover:text-ink'}`}>{children}</button>
}

export function StatCard({ label, value, tone }) {
  const toneClass = tone === 'bad' ? 'text-red-700' : tone === 'good' ? 'text-green-700' : 'text-ink'
  return (
    <div className="rounded-2xl bg-white border border-ink/10 p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-ink/50">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${toneClass}`}>{value}</p>
    </div>
  )
}

export function Field({ label, children }) {
  return <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-steel">{label}{children}</label>
}

export const inputCls = 'h-11 rounded-lg bg-white text-ink px-3 border border-ink/20 focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold'
