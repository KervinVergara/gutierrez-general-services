import { useEffect, useState } from 'react'
import { db, isConfigured } from '../firebase'
import Icon from './Icon'

export default function FeedbackWidget({ t }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [text, setText] = useState('')

  useEffect(() => {
    if (!isConfigured || !open) return
    let unsub = null
    import('firebase/firestore').then(({ collection, onSnapshot, orderBy, query }) => {
      unsub = onSnapshot(query(collection(db, 'feedback'), orderBy('createdAt', 'desc')), (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      })
    })
    return () => unsub && unsub()
  }, [open])

  async function add(e) {
    e.preventDefault()
    if (!text.trim()) return
    const { addDoc, collection, serverTimestamp } = await import('firebase/firestore')
    await addDoc(collection(db, 'feedback'), { text: text.trim(), status: 'pending', createdAt: serverTimestamp() })
    setText('')
  }

  async function toggle(item) {
    const { doc, updateDoc } = await import('firebase/firestore')
    await updateDoc(doc(db, 'feedback', item.id), { status: item.status === 'done' ? 'pending' : 'done' })
  }

  async function remove(id) {
    const { doc, deleteDoc } = await import('firebase/firestore')
    await deleteDoc(doc(db, 'feedback', id))
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t.title}
        className="fixed bottom-5 right-5 z-40 grid place-items-center w-14 h-14 rounded-full bg-gold text-white shadow-lg hover:bg-gold-2"
      >
        <Icon name="plus" size={26} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-ink/50 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm max-h-[80vh] rounded-2xl bg-white p-5 grid gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink">{t.title}</h3>
              <button onClick={() => setOpen(false)} aria-label="Close" className="grid place-items-center w-8 h-8 rounded-full border border-ink/15 hover:border-ink"><Icon name="x" size={16} /></button>
            </div>

            <form onSubmit={add} className="flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t.placeholder}
                className="flex-1 h-11 rounded-lg bg-white text-ink px-3 border border-ink/15 placeholder:text-steel/70 focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
              />
              <button className="h-11 w-11 shrink-0 grid place-items-center rounded-lg bg-gold text-white hover:bg-gold-2"><Icon name="plus" size={18} /></button>
            </form>

            <div className="grid gap-2 overflow-y-auto">
              {items.length === 0 && <p className="text-sm text-steel">{t.empty}</p>}
              {items.map((i) => (
                <div key={i.id} className="flex items-start gap-2.5 rounded-lg border border-ink/10 p-2.5">
                  <button onClick={() => toggle(i)} aria-label="Done" className={`mt-0.5 grid place-items-center w-5 h-5 rounded-full border-2 shrink-0 ${i.status === 'done' ? 'bg-green-600 border-green-600 text-white' : 'border-ink/30'}`}>
                    {i.status === 'done' && <Icon name="check" size={12} />}
                  </button>
                  <p className={`flex-1 text-sm text-ink ${i.status === 'done' ? 'line-through text-ink/40' : ''}`}>{i.text}</p>
                  <button onClick={() => remove(i.id)} aria-label="Delete" className="shrink-0 grid place-items-center w-7 h-7 rounded-full hover:bg-red-50 hover:text-red-600"><Icon name="trash" size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
