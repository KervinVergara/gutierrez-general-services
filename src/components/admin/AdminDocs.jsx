import { useEffect, useState } from 'react'
import { db } from '../../firebase'
import { content, BUSINESS, PHONE_DISPLAY } from '../../content'
import Icon from '../Icon'
import { Field, inputCls, TabBtn, FilterBtn } from './shared'
import { money, fmtDate } from './util'
import DocModal from './DocModal'
import SocialDoc from './SocialDoc'
import logo from '../../assets/photos/logo-new.png'

const logoUrl = new URL(logo, window.location.origin).toString()
const GROUP_ORDER = ['auto', 'property', 'seasonal']

const DOC_LABELS = {
  es: {
    quoteDocTitle: 'Cotización', quoteSubtitle: 'Cotización de servicio', client: 'Cliente', service: 'Servicio', price: 'Precio', total: 'Total',
    customQuote: 'Cotización personalizada', notesDefault: 'Cotización válida por 15 días. El precio final puede variar según el tamaño y condición del área o vehículo.',
    catalogDocTitle: 'Nuestros servicios', catalogSubtitle: 'Catálogo de servicios', from: 'Desde', free: 'Gratis', quote: 'Cotización',
  },
  en: {
    quoteDocTitle: 'Quote', quoteSubtitle: 'Service quote', client: 'Client', service: 'Service', price: 'Price', total: 'Total',
    customQuote: 'Custom quote', notesDefault: 'Quote valid for 15 days. Final price may vary depending on the size and condition of the area or vehicle.',
    catalogDocTitle: 'Our services', catalogSubtitle: 'Service catalog', from: 'From', free: 'Free', quote: 'Quote',
  },
}

const today = () => new Date().toISOString().slice(0, 10)

function priceLabel(s, L) {
  if (s.priceType === 'from') return `${L.from} ${money(String(s.price).replace('$', ''))}`
  if (s.priceType === 'free') return L.free
  return L.quote
}

function headerHtml(subtitle) {
  return `<div class="header"><img src="${logoUrl}" /><div><h1>${BUSINESS}</h1><p>${subtitle} · Warsaw, Indiana · ${PHONE_DISPLAY}</p></div></div>`
}

export default function AdminDocs() {
  const [mode, setMode] = useState('quote')
  const [docLang, setDocLang] = useState('es')

  return (
    <div>
      <div className="flex items-center justify-between mb-6 border-b border-ink/10 flex-wrap gap-3">
        <div className="flex items-center gap-1">
          <TabBtn active={mode === 'quote'} onClick={() => setMode('quote')}>Cotización</TabBtn>
          <TabBtn active={mode === 'catalog'} onClick={() => setMode('catalog')}>Catálogo</TabBtn>
          <TabBtn active={mode === 'social'} onClick={() => setMode('social')}>Publicidad</TabBtn>
        </div>
        {mode !== 'social' && (
          <div className="flex items-center gap-2 pb-2">
            <FilterBtn active={docLang === 'es'} onClick={() => setDocLang('es')}>ES</FilterBtn>
            <FilterBtn active={docLang === 'en'} onClick={() => setDocLang('en')}>EN</FilterBtn>
          </div>
        )}
      </div>
      {mode === 'quote' && <QuoteDoc docLang={docLang} />}
      {mode === 'catalog' && <CatalogDoc docLang={docLang} />}
      {mode === 'social' && <SocialDoc />}
    </div>
  )
}

function QuoteDoc({ docLang }) {
  const L = DOC_LABELS[docLang]
  const SERVICES = content[docLang].services.filter((s) => !s.hidden)
  const [clients, setClients] = useState([])
  const [clientId, setClientId] = useState('')
  const [manualName, setManualName] = useState('')
  const [manualPhone, setManualPhone] = useState('')
  const [date, setDate] = useState(today())
  const [notes, setNotes] = useState(L.notesDefault)
  const [items, setItems] = useState([{ description: '', price: '' }])
  const [pick, setPick] = useState('')
  const [doc, setDoc] = useState(null)

  useEffect(() => { setNotes(L.notesDefault) }, [docLang])

  useEffect(() => {
    let unsub = null
    import('firebase/firestore').then(({ collection, onSnapshot, orderBy, query }) => {
      unsub = onSnapshot(query(collection(db, 'clients'), orderBy('name')), (snap) => {
        setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      })
    })
    return () => unsub && unsub()
  }, [])

  function updateItem(i, field, value) {
    setItems((its) => its.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)))
  }
  function addItem() { setItems((its) => [...its, { description: '', price: '' }]) }
  function removeItem(i) { setItems((its) => its.filter((_, idx) => idx !== i)) }
  function addFromCatalog() {
    const s = SERVICES.find((x) => x.id === pick)
    if (!s) return
    setItems((its) => [...its.filter((it) => it.description), { description: s.title, price: s.price ? String(s.price).replace('$', '') : '' }])
    setPick('')
  }

  const total = items.reduce((sum, it) => sum + (Number(it.price) || 0), 0)
  const client = clients.find((c) => c.id === clientId)
  const clientName = client?.name || manualName
  const clientPhone = client?.phone || manualPhone

  function generate() {
    const rows = items.filter((it) => it.description).map((it) => `<tr><td>${it.description}</td><td class="right">${it.price ? money(it.price) : L.customQuote}</td></tr>`).join('')
    const html = `
      ${headerHtml(L.quoteSubtitle)}
      <h2>${L.quoteDocTitle}</h2>
      <p class="muted">${fmtDate(date)}</p>
      <p style="margin-top:14px"><strong>${L.client}:</strong> ${clientName || '—'}${clientPhone ? ` · ${clientPhone}` : ''}</p>
      <table><thead><tr><th>${L.service}</th><th class="right">${L.price}</th></tr></thead><tbody>
        ${rows}
        <tr class="total-row"><td>${L.total}</td><td class="right">${money(total)}</td></tr>
      </tbody></table>
      <p class="muted" style="margin-top:20px;font-size:12px">${notes}</p>
      <div class="footer">${BUSINESS} · ${PHONE_DISPLAY} · Warsaw, Indiana</div>
    `
    setDoc({ title: `${L.quoteDocTitle} — ${clientName || 'cliente'}`, html })
  }

  return (
    <div className="rounded-2xl bg-white border border-ink/10 p-5 grid gap-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Cliente existente">
          <select className={inputCls} value={clientId} onChange={(e) => { setClientId(e.target.value); setManualName(''); setManualPhone('') }}>
            <option value="">— Escribir manualmente —</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name || c.phone}</option>)}
          </select>
        </Field>
        <Field label="Fecha"><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        {!clientId && (
          <>
            <Field label="Nombre del cliente"><input className={inputCls} value={manualName} onChange={(e) => setManualName(e.target.value)} /></Field>
            <Field label="Teléfono"><input className={inputCls} value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} /></Field>
          </>
        )}
      </div>

      <div className="flex items-end gap-2">
        <Field label="Agregar desde el catálogo">
          <select className={inputCls} value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Seleccione un servicio</option>
            {SERVICES.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </Field>
        <button type="button" onClick={addFromCatalog} className="h-11 px-4 rounded-lg border border-ink/20 font-bold text-sm">Agregar</button>
      </div>

      <div className="grid gap-2">
        {items.map((it, i) => (
          <div key={i} className="flex gap-2">
            <input placeholder="Descripción del servicio" className={`${inputCls} flex-1`} value={it.description} onChange={(e) => updateItem(i, 'description', e.target.value)} />
            <input placeholder="Precio" type="number" min="0" step="0.01" className={`${inputCls} w-32`} value={it.price} onChange={(e) => updateItem(i, 'price', e.target.value)} />
            <button type="button" onClick={() => removeItem(i)} aria-label="Quitar" className="grid place-items-center w-11 h-11 rounded-lg border border-ink/15 hover:border-red-600 hover:text-red-600"><Icon name="trash" size={15} /></button>
          </div>
        ))}
        <button type="button" onClick={addItem} className="justify-self-start text-sm font-bold text-ink hover:underline">+ Agregar línea</button>
      </div>

      <Field label="Notas / condiciones"><textarea rows="2" className={`${inputCls} w-full h-auto py-2`} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>

      <div className="flex items-center justify-between border-t border-ink/10 pt-4">
        <p className="text-lg font-extrabold text-ink">Total: {money(total)}</p>
        <button onClick={generate} className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-gold text-ink font-bold"><Icon name="tag" size={16} /> Generar</button>
      </div>

      {doc && <DocModal title={doc.title} html={doc.html} onClose={() => setDoc(null)} />}
    </div>
  )
}

function CatalogDoc({ docLang }) {
  const L = DOC_LABELS[docLang]
  const seed = () => content[docLang].services.filter((s) => !s.hidden).map((s) => ({
    id: s.id, included: true, title: s.title, priceText: priceLabel(s, L), lead: s.lead, group: s.group,
  }))
  const [items, setItems] = useState(seed)
  const [catTitle, setCatTitle] = useState(L.catalogDocTitle)
  const [doc, setDoc] = useState(null)

  useEffect(() => { setItems(seed()); setCatTitle(L.catalogDocTitle) }, [docLang])

  function update(id, field, value) {
    setItems((its) => its.map((it) => (it.id === id ? { ...it, [field]: value } : it)))
  }
  function remove(id) { setItems((its) => its.filter((it) => it.id !== id)) }
  function addCustom() {
    setItems((its) => [...its, { id: `custom-${Date.now()}`, included: true, title: '', priceText: '', lead: '', group: 'custom' }])
  }

  function generate() {
    const included = items.filter((it) => it.included && it.title)
    const groups = [...GROUP_ORDER, 'custom'].map((g) => {
      const gi = included.filter((it) => it.group === g)
      if (gi.length === 0) return ''
      const rows = gi.map((it) => `<div class="cat-item"><div class="row"><span>${it.title}</span><span>${it.priceText}</span></div>${it.lead ? `<p>${it.lead}</p>` : ''}</div>`).join('')
      const label = g === 'custom' ? '' : `<h3>${content[docLang].groups[g].title}</h3>`
      return `<div class="cat-group">${label}${rows}</div>`
    }).join('')
    const html = `
      ${headerHtml(L.catalogSubtitle)}
      <h2>${catTitle}</h2>
      ${groups}
      <div class="footer">${BUSINESS} · ${PHONE_DISPLAY} · Warsaw, Indiana</div>
    `
    setDoc({ title: catTitle, html })
  }

  return (
    <div className="rounded-2xl bg-white border border-ink/10 p-5 grid gap-4">
      <Field label="Título del catálogo"><input className={inputCls} value={catTitle} onChange={(e) => setCatTitle(e.target.value)} /></Field>
      <p className="text-xs text-ink/50">Desmarca lo que no quieras mostrar, o edita el nombre y precio de cada línea.</p>
      <div className="grid gap-2">
        {items.map((it) => (
          <div key={it.id} className={`flex items-center gap-2 rounded-lg border p-2 ${it.included ? 'border-ink/10' : 'border-ink/5 opacity-50'}`}>
            <input type="checkbox" checked={it.included} onChange={(e) => update(it.id, 'included', e.target.checked)} className="w-4 h-4 accent-[var(--color-gold)] shrink-0" />
            <input placeholder="Servicio" className={`${inputCls} flex-1 h-10`} value={it.title} onChange={(e) => update(it.id, 'title', e.target.value)} />
            <input placeholder="Precio" className={`${inputCls} w-32 h-10`} value={it.priceText} onChange={(e) => update(it.id, 'priceText', e.target.value)} />
            <button onClick={() => remove(it.id)} aria-label="Quitar" className="grid place-items-center w-9 h-9 rounded-lg border border-ink/15 hover:border-red-600 hover:text-red-600 shrink-0"><Icon name="trash" size={14} /></button>
          </div>
        ))}
      </div>
      <button onClick={addCustom} className="justify-self-start text-sm font-bold text-ink hover:underline">+ Agregar servicio personalizado</button>

      <div className="border-t border-ink/10 pt-4">
        <button onClick={generate} className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-gold text-ink font-bold"><Icon name="tag" size={16} /> Generar</button>
      </div>

      {doc && <DocModal title={doc.title} html={doc.html} onClose={() => setDoc(null)} />}
    </div>
  )
}
