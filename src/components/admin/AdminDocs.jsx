import { useEffect, useState } from 'react'
import { db } from '../../firebase'
import { content, BUSINESS, PHONE_DISPLAY } from '../../content'
import Icon from '../Icon'
import { Field, inputCls, TabBtn } from './shared'
import { money, fmtDate } from './util'
import { printDoc } from './print'
import logo from '../../assets/photos/logo-new.png'

const logoUrl = new URL(logo, window.location.origin).toString()
const SERVICES = content.es.services.filter((s) => !s.hidden)
const GROUP_ORDER = ['auto', 'property', 'seasonal']
const GROUP_LABEL = { auto: content.es.groups.auto.title, property: content.es.groups.property.title, seasonal: content.es.groups.seasonal.title }

const today = () => new Date().toISOString().slice(0, 10)

function priceLabel(s) {
  if (s.priceType === 'from') return `Desde ${money(s.price.replace('$', ''))}`
  if (s.priceType === 'free') return 'Gratis'
  return 'Cotización'
}

function headerHtml(subtitle) {
  return `<div class="header"><img src="${logoUrl}" /><div><h1>${BUSINESS}</h1><p>${subtitle} · Warsaw, Indiana · ${PHONE_DISPLAY}</p></div></div>`
}

export default function AdminDocs() {
  const [mode, setMode] = useState('quote')
  return (
    <div>
      <div className="flex items-center gap-1 mb-6 border-b border-ink/10">
        <TabBtn active={mode === 'quote'} onClick={() => setMode('quote')}>Cotización</TabBtn>
        <TabBtn active={mode === 'catalog'} onClick={() => setMode('catalog')}>Catálogo</TabBtn>
        <TabBtn active={mode === 'flyer'} onClick={() => setMode('flyer')}>Publicidad</TabBtn>
      </div>
      {mode === 'quote' && <QuoteDoc />}
      {mode === 'catalog' && <CatalogDoc />}
      {mode === 'flyer' && <FlyerDoc />}
    </div>
  )
}

function QuoteDoc() {
  const [clients, setClients] = useState([])
  const [clientId, setClientId] = useState('')
  const [manualName, setManualName] = useState('')
  const [manualPhone, setManualPhone] = useState('')
  const [date, setDate] = useState(today())
  const [notes, setNotes] = useState('Cotización válida por 15 días. El precio final puede variar según el tamaño y condición del área o vehículo.')
  const [items, setItems] = useState([{ description: '', price: '' }])
  const [pick, setPick] = useState('')

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
    setItems((its) => [...its.filter((it) => it.description), { description: s.title, price: s.price ? s.price.replace('$', '') : '' }])
    setPick('')
  }

  const total = items.reduce((sum, it) => sum + (Number(it.price) || 0), 0)
  const client = clients.find((c) => c.id === clientId)
  const clientName = client?.name || manualName
  const clientPhone = client?.phone || manualPhone

  function generate() {
    const rows = items.filter((it) => it.description).map((it) => `<tr><td>${it.description}</td><td class="right">${it.price ? money(it.price) : 'Cotización personalizada'}</td></tr>`).join('')
    const html = `
      ${headerHtml('Cotización de servicio')}
      <h2>Cotización</h2>
      <p class="muted">${fmtDate(date)}</p>
      <p style="margin-top:14px"><strong>Cliente:</strong> ${clientName || '—'}${clientPhone ? ` · ${clientPhone}` : ''}</p>
      <table><thead><tr><th>Servicio</th><th class="right">Precio</th></tr></thead><tbody>
        ${rows}
        <tr class="total-row"><td>Total</td><td class="right">${money(total)}</td></tr>
      </tbody></table>
      <p class="muted" style="margin-top:20px;font-size:12px">${notes}</p>
      <div class="footer">${BUSINESS} · ${PHONE_DISPLAY} · Warsaw, Indiana</div>
    `
    printDoc(html, `Cotización — ${clientName || 'cliente'}`)
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
        <button onClick={generate} className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-gold text-ink font-bold"><Icon name="tag" size={16} /> Generar PDF</button>
      </div>
    </div>
  )
}

function CatalogDoc() {
  function generate() {
    const groups = GROUP_ORDER.map((g) => {
      const items = SERVICES.filter((s) => s.group === g).map((s) => `
        <div class="cat-item"><div class="row"><span>${s.title}</span><span>${priceLabel(s)}</span></div><p>${s.lead}</p></div>
      `).join('')
      return `<div class="cat-group"><h3>${GROUP_LABEL[g]}</h3>${items}</div>`
    }).join('')
    const html = `
      ${headerHtml('Catálogo de servicios')}
      <h2>Nuestros servicios</h2>
      ${groups}
      <div class="footer">${BUSINESS} · ${PHONE_DISPLAY} · Warsaw, Indiana</div>
    `
    printDoc(html, 'Catálogo de servicios')
  }
  return (
    <div className="rounded-2xl bg-white border border-ink/10 p-5">
      <p className="text-ink/70 mb-4">Genera un catálogo con todos los servicios confirmados, agrupados por categoría, listo para imprimir o guardar como PDF.</p>
      <button onClick={generate} className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-gold text-ink font-bold"><Icon name="tag" size={16} /> Generar catálogo</button>
    </div>
  )
}

function FlyerDoc() {
  function generate() {
    const html = `
      ${headerHtml('Publicidad')}
      <p class="badge">Warsaw, Indiana</p>
      <p class="flyer-title">Su carro. Su casa.<br/>Bien cuidados.</p>
      <p class="flyer-sub">Detallado profesional de vehículos, cuidado de propiedades y servicios de temporada.</p>
      <div class="grid3">
        ${GROUP_ORDER.map((g) => `<div class="card"><h3>${GROUP_LABEL[g]}</h3><p>${content.es.groups[g].lead}</p></div>`).join('')}
      </div>
      <a class="cta">Cotización gratis · ${PHONE_DISPLAY}</a>
      <div class="footer">${BUSINESS} · gutierrez-general-services.web.app</div>
    `
    printDoc(html, 'Publicidad')
  }
  return (
    <div className="rounded-2xl bg-white border border-ink/10 p-5">
      <p className="text-ink/70 mb-4">Genera un volante de una página con el logo, los servicios principales y los datos de contacto.</p>
      <button onClick={generate} className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-gold text-ink font-bold"><Icon name="tag" size={16} /> Generar publicidad</button>
    </div>
  )
}
