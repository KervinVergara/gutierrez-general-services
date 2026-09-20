import { useEffect, useState } from 'react'
import { db } from '../../firebase'
import Icon from '../Icon'
import { fmtDate } from './util'

export default function AdminRequests() {
  const [items, setItems] = useState([])
  const [err, setErr] = useState('')

  useEffect(() => {
    let unsub = null
    import('firebase/firestore').then(({ collection, onSnapshot, orderBy, query }) => {
      unsub = onSnapshot(query(collection(db, 'feedback'), orderBy('createdAt', 'desc')), (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      }, (e) => setErr(e.message))
    })
    return () => unsub && unsub()
  }, [])

  async function toggle(item) {
    const { doc, updateDoc } = await import('firebase/firestore')
    await updateDoc(doc(db, 'feedback', item.id), { status: item.status === 'done' ? 'pending' : 'done' })
  }

  async function remove(id) {
    const { doc, deleteDoc } = await import('firebase/firestore')
    await deleteDoc(doc(db, 'feedback', id))
  }

  const pending = items.filter((i) => i.status !== 'done')
  const done = items.filter((i) => i.status === 'done')

  return (
    <div>
      <p className="text-ink/60 text-sm mb-6">Cambios que el cliente pide desde el botón flotante de la web. Los marcas hechos cuando los publiques.</p>
      {err && <p className="mb-4 text-sm text-red-700">{err}</p>}
      {items.length === 0 && <p className="text-ink/60">No hay solicitudes todavía.</p>}
      <div className="grid gap-3">
        {[...pending, ...done].map((i) => (
          <article key={i.id} className={`rounded-xl bg-white border border-ink/10 p-4 flex items-start gap-3 ${i.status === 'done' ? 'opacity-50' : ''}`}>
            <button onClick={() => toggle(i)} aria-label="Marcar hecho" className={`mt-0.5 grid place-items-center w-6 h-6 rounded-full border-2 shrink-0 ${i.status === 'done' ? 'bg-green-600 border-green-600 text-white' : 'border-ink/30'}`}>
              {i.status === 'done' && <Icon name="check" size={14} />}
            </button>
            <div className="flex-1">
              <p className={`text-ink ${i.status === 'done' ? 'line-through' : ''}`}>{i.text}</p>
              <p className="mt-1 text-xs text-ink/50">{i.createdAt?.toDate ? i.createdAt.toDate().toLocaleString('es-CO') : fmtDate(i.date)}</p>
            </div>
            <button onClick={() => remove(i.id)} aria-label="Eliminar" className="grid place-items-center w-8 h-8 rounded-full border border-ink/15 shrink-0 hover:border-red-600 hover:text-red-600"><Icon name="trash" size={15} /></button>
          </article>
        ))}
      </div>
    </div>
  )
}
