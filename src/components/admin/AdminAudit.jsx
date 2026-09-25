import { useEffect, useState } from 'react'
import { db } from '../../firebase'
import { Loading, EmptyState, FilterBtn } from './shared'

const COLLECTIONS = ['clients', 'jobs', 'finance', 'plans']
const COL_LABEL = { clients: 'Clientes', jobs: 'Servicios', finance: 'Finanzas', plans: 'Planes' }
const OP_LABEL = { create: 'Creado', update: 'Editado', delete: 'Eliminado' }
const OP_COLOR = { create: 'bg-green-100 text-green-900', update: 'bg-blue-100 text-blue-900', delete: 'bg-red-100 text-red-900' }

// Solo lectura — muestra el rastro que dejan las Cloud Functions de auditoría
// (functions/index.js, audit_clients/jobs/finance/plans) cada vez que se
// crea, edita o borra un registro en esas 4 colecciones. Nadie, ni siquiera
// una sesión admin comprometida, puede editar o borrar estas entradas desde
// el navegador — firestore.rules solo permite lectura aquí.
export default function AdminAudit() {
  const [items, setItems] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    let unsub = null
    import('firebase/firestore').then(({ collection, onSnapshot, orderBy, query, limit }) => {
      unsub = onSnapshot(query(collection(db, 'auditLog'), orderBy('at', 'desc'), limit(200)), (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoaded(true)
      }, (e) => setErr(e.message))
    })
    return () => unsub && unsub()
  }, [])

  const shown = filter === 'all' ? items : items.filter((i) => i.collection === filter)

  if (!loaded) return <Loading />

  return (
    <div>
      <p className="text-ink/60 text-sm mb-4">Últimos 200 cambios en clientes, servicios, finanzas y planes — quién, cuándo y qué cambió. Solo lectura.</p>
      {err && <p className="mb-4 text-sm text-red-700">{err}</p>}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')}>Todo</FilterBtn>
        {COLLECTIONS.map((c) => <FilterBtn key={c} active={filter === c} onClick={() => setFilter(c)}>{COL_LABEL[c]}</FilterBtn>)}
      </div>
      {shown.length === 0 && <EmptyState title="No hay cambios registrados todavía." />}
      <div className="grid gap-2">
        {shown.map((i) => (
          <article key={i.id} className="rounded-xl bg-white border border-ink/10 p-4">
            <button onClick={() => setOpen(open === i.id ? null : i.id)} className="w-full flex items-center gap-3 text-left">
              <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ${OP_COLOR[i.op] || 'bg-ink/10'}`}>{OP_LABEL[i.op] || i.op}</span>
              <span className="text-sm font-semibold">{COL_LABEL[i.collection] || i.collection}</span>
              <span className="text-xs text-ink/50 truncate">{i.docId}</span>
              <span className="ml-auto text-xs text-ink/50 shrink-0">{i.actorEmail || i.actor || 'desconocido'}</span>
              <span className="text-xs text-ink/40 shrink-0">{i.at?.toDate ? i.at.toDate().toLocaleString('es-CO') : ''}</span>
            </button>
            {open === i.id && (
              <div className="mt-3 grid sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="font-semibold text-ink/60 mb-1">Antes</p>
                  <pre className="bg-sand rounded-lg p-2 overflow-auto max-h-64 whitespace-pre-wrap break-all">{i.before ? JSON.stringify(i.before, null, 2) : '—'}</pre>
                </div>
                <div>
                  <p className="font-semibold text-ink/60 mb-1">Después</p>
                  <pre className="bg-sand rounded-lg p-2 overflow-auto max-h-64 whitespace-pre-wrap break-all">{i.after ? JSON.stringify(i.after, null, 2) : '—'}</pre>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}
