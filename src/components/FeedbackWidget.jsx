import { useState } from 'react'
import { db, isConfigured } from '../firebase'
import Icon from './Icon'

export default function FeedbackWidget({ t, lang }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [state, setState] = useState('idle') // idle | sending | ok | err

  async function submit(e) {
    e.preventDefault()
    if (state === 'sending' || !text.trim()) return
    setState('sending')
    try {
      if (!isConfigured) throw new Error('Firebase not configured')
      const { addDoc, collection, serverTimestamp } = await import('firebase/firestore')
      await addDoc(collection(db, 'feedback'), {
        text: text.trim(),
        status: 'pending',
        lang,
        page: window.location.pathname,
        createdAt: serverTimestamp(),
        userAgent: navigator.userAgent,
      })
      setState('ok')
      setText('')
    } catch (err) {
      console.error(err)
      setState('err')
    }
  }

  function close() {
    setOpen(false)
    setState('idle')
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
        <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-ink/50 p-4" onClick={close}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 grid gap-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-bold text-ink">{t.title}</h3>
              <button onClick={close} aria-label="Close" className="grid place-items-center w-8 h-8 rounded-full border border-ink/15 shrink-0 hover:border-ink"><Icon name="x" size={16} /></button>
            </div>

            {state === 'ok' ? (
              <p className="text-steel">{t.ok}</p>
            ) : (
              <form onSubmit={submit} className="grid gap-3">
                <p className="text-sm text-steel">{t.sub}</p>
                <textarea
                  required
                  rows="4"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t.placeholder}
                  className="w-full rounded-xl bg-white text-ink px-4 py-3 border border-ink/15 placeholder:text-steel/70 focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                />
                {state === 'err' && <p className="text-sm font-medium text-red-600">{t.err}</p>}
                <button disabled={state === 'sending'} className="h-12 rounded-full bg-gold text-white font-bold hover:bg-gold-2 disabled:opacity-60">
                  {state === 'sending' ? t.sending : t.send}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
