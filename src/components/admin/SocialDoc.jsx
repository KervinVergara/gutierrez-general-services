import { useEffect, useRef, useState } from 'react'
import { content, BUSINESS, PHONE_DISPLAY } from '../../content'
import Icon from '../Icon'
import { Field, inputCls, FilterBtn } from './shared'
import DocModal from './DocModal'
import logoSrc from '../../assets/photos/logo-new.png'

const WEBSITE = 'gutierrez-general-services.web.app'
const logoUrl = new URL(logoSrc, window.location.origin).toString()

const CONFIG_FORMATS = [
  { id: 'ig_post', label: 'Instagram Post' },
  { id: 'ig_story', label: 'Instagram Story' },
  { id: 'flyer', label: 'Printable Letter/Flyer' },
]
const FORMATS = [
  { id: 'ig_post', label: 'Instagram / Facebook — Post cuadrado', w: 1080, h: 1080 },
  { id: 'ig_story', label: 'Instagram / TikTok — Historia', w: 1080, h: 1920 },
]
const TEMPLATES = [
  { id: 'full', label: 'Foto completa' },
  { id: 'card', label: 'Panel inferior' },
  { id: 'badge', label: 'Insignia minimal' },
]

const NAVY = '#123b55'
const GOLD = '#f3c64e'

let logoImgPromise = null
function loadLogo() {
  if (!logoImgPromise) {
    logoImgPromise = new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = logoSrc
    })
  }
  return logoImgPromise
}

function loadFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

function coverDraw(ctx, img, x, y, w, h) {
  const ir = img.width / img.height
  const r = w / h
  let sx, sy, sw, sh
  if (ir > r) { sh = img.height; sw = sh * r; sx = (img.width - sw) / 2; sy = 0 }
  else { sw = img.width; sh = sw / r; sx = 0; sy = (img.height - sh) / 2 }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

function wrapLines(ctx, text, maxWidth, maxLines) {
  const paragraphs = (text || '').split(/\n/)
  const lines = []
  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean)
    let line = ''
    for (const word of words) {
      const test = line ? `${line} ${word}` : word
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word }
      else line = test
    }
    lines.push(line)
  }
  if (maxLines && lines.length > maxLines) {
    const kept = lines.slice(0, maxLines)
    kept[maxLines - 1] = kept[maxLines - 1].replace(/\s*$/, '') + '…'
    return kept
  }
  return lines
}

function drawLogoBadge(ctx, logoImg, cx, cy, r) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.94)'
  ctx.fill()
  if (logoImg) {
    ctx.beginPath()
    ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2)
    ctx.clip()
    coverDraw(ctx, logoImg, cx - r * 0.82, cy - r * 0.82, r * 1.64, r * 1.64)
  }
  ctx.restore()
}

async function draw(canvas, { format, template, photoImg, logoImg, title, subtitle, cta }) {
  const { w, h } = format
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')

  try { await document.fonts.load(`800 ${Math.round(w * 0.08)}px Manrope`); await document.fonts.ready } catch { /* fall back to default font */ }

  ctx.fillStyle = NAVY
  ctx.fillRect(0, 0, w, h)
  if (photoImg) coverDraw(ctx, photoImg, 0, 0, w, h)

  const pad = w * 0.07
  ctx.textBaseline = 'alphabetic'

  if (template === 'card') {
    const panelH = h * 0.34
    ctx.fillStyle = NAVY
    ctx.fillRect(0, h - panelH, w, panelH)
    drawLogoBadge(ctx, logoImg, pad + w * 0.045, pad + w * 0.045, w * 0.045)

    let y = h - panelH + panelH * 0.32
    ctx.fillStyle = GOLD
    ctx.font = `800 ${Math.round(w * 0.065)}px Manrope, sans-serif`
    const titleLines = wrapLines(ctx, title, w - pad * 2, 2)
    titleLines.forEach((l) => { ctx.fillText(l, pad, y); y += w * 0.075 })

    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.font = `600 ${Math.round(w * 0.032)}px Manrope, sans-serif`
    const subLines = wrapLines(ctx, subtitle, w - pad * 2, 2)
    subLines.forEach((l) => { ctx.fillText(l, pad, y); y += w * 0.042 })

    y += w * 0.02
    const ctaText = cta
    ctx.font = `800 ${Math.round(w * 0.03)}px Manrope, sans-serif`
    const ctaW = ctx.measureText(ctaText).width + w * 0.06
    ctx.fillStyle = GOLD
    roundRect(ctx, pad, y, ctaW, w * 0.06, w * 0.03)
    ctx.fill()
    ctx.fillStyle = NAVY
    ctx.fillText(ctaText, pad + w * 0.03, y + w * 0.04)
  } else if (template === 'badge') {
    drawLogoBadge(ctx, logoImg, pad + w * 0.045, pad + w * 0.045, w * 0.045)

    const boxY = h - h * 0.16 - w * 0.14
    ctx.font = `800 ${Math.round(w * 0.045)}px Manrope, sans-serif`
    const titleLines = wrapLines(ctx, title, w * 0.7, 2)
    const lineH = w * 0.056
    const boxH = lineH * titleLines.length + w * 0.08
    const boxW = Math.max(...titleLines.map((l) => ctx.measureText(l).width)) + w * 0.1

    ctx.fillStyle = 'rgba(18,59,85,0.85)'
    roundRect(ctx, pad, boxY, boxW, boxH, w * 0.02)
    ctx.fill()

    ctx.fillStyle = '#fff'
    let y = boxY + w * 0.055
    titleLines.forEach((l) => { ctx.fillText(l, pad + w * 0.04, y); y += lineH })

    ctx.font = `600 ${Math.round(w * 0.024)}px Manrope, sans-serif`
    ctx.fillStyle = GOLD
    ctx.fillText(cta, pad, h - h * 0.06)
  } else {
    const grad = ctx.createLinearGradient(0, h * 0.35, 0, h)
    grad.addColorStop(0, 'rgba(18,59,85,0)')
    grad.addColorStop(1, 'rgba(18,59,85,0.92)')
    ctx.fillStyle = grad
    ctx.fillRect(0, h * 0.35, w, h * 0.65)
    drawLogoBadge(ctx, logoImg, pad + w * 0.045, pad + w * 0.045, w * 0.045)

    let y = h - h * 0.14
    ctx.font = `600 ${Math.round(w * 0.028)}px Manrope, sans-serif`
    ctx.fillStyle = GOLD
    ctx.fillText(cta, pad, y)
    y -= w * 0.05

    ctx.font = `600 ${Math.round(w * 0.03)}px Manrope, sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.88)'
    const subLines = wrapLines(ctx, subtitle, w - pad * 2, 2)
    for (let i = subLines.length - 1; i >= 0; i--) { ctx.fillText(subLines[i], pad, y); y -= w * 0.04 }
    y -= w * 0.015

    ctx.font = `800 ${Math.round(w * 0.075)}px Manrope, sans-serif`
    ctx.fillStyle = '#fff'
    const titleLines = wrapLines(ctx, title, w - pad * 2, 2)
    for (let i = titleLines.length - 1; i >= 0; i--) { ctx.fillText(titleLines[i], pad, y); y -= w * 0.085 }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function flyerHeaderHtml(subtitle) {
  return `<div class="header"><img src="${logoUrl}" /><div><h1>${BUSINESS}</h1><p>${subtitle} · Warsaw, Indiana · ${PHONE_DISPLAY}</p></div></div>`
}

export default function SocialDoc() {
  const [phase, setPhase] = useState('config')
  const [lang, setLang] = useState('es')
  const [selectedIds, setSelectedIds] = useState([])
  const [promoTitle, setPromoTitle] = useState('')
  const [format, setFormat] = useState('ig_post')
  const [showPhone, setShowPhone] = useState(true)
  const [showWebsite, setShowWebsite] = useState(true)
  const [editorInit, setEditorInit] = useState(null)
  const [flyerDoc, setFlyerDoc] = useState(null)

  const SERVICES = content[lang].services.filter((s) => !s.hidden)

  function toggleService(id) {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  }

  function ctaLine() {
    const parts = []
    if (showPhone) parts.push(PHONE_DISPLAY)
    if (showWebsite) parts.push(WEBSITE)
    return parts.join(' · ') || (lang === 'es' ? 'Cotización gratis' : 'Free quote')
  }

  function generateAdvertising() {
    const chosen = SERVICES.filter((s) => selectedIds.includes(s.id))
    const title = promoTitle || (lang === 'es' ? 'Su carro. Su casa.\nBien cuidados.' : 'Your Car. Your Home.\nTaken Care Of.')

    if (format === 'flyer') {
      const rows = chosen.map((s) => `<div class="cat-item"><div class="row"><span>${s.title}</span></div><p>${s.lead}</p></div>`).join('')
      const html = `
        ${flyerHeaderHtml(lang === 'es' ? 'Publicidad' : 'Advertising')}
        <h2>${title.replace(/\n/g, ' ')}</h2>
        ${rows}
        <p class="muted" style="margin-top:20px">${ctaLine()}</p>
        <div class="footer">${BUSINESS} · Warsaw, Indiana</div>
      `
      setFlyerDoc({ title: promoTitle || 'Advertising', html })
      return
    }

    setEditorInit({
      title,
      subtitle: chosen.map((s) => s.title).join(' · ') || (lang === 'es' ? 'Detallado de vehículos, cuidado de propiedad y servicios de temporada.' : 'Vehicle detailing, property care and seasonal services.'),
      cta: ctaLine(),
      formatId: format,
    })
    setPhase('edit')
  }

  if (phase === 'edit' && editorInit) {
    return <SocialEditor init={editorInit} onBack={() => setPhase('config')} />
  }

  return (
    <div className="rounded-2xl bg-white border border-ink/10 p-5 grid gap-4 max-w-2xl">
      <Field label="Idioma">
        <div className="flex gap-2">
          <FilterBtn active={lang === 'es'} onClick={() => setLang('es')}>Español</FilterBtn>
          <FilterBtn active={lang === 'en'} onClick={() => setLang('en')}>English</FilterBtn>
        </div>
      </Field>

      <Field label="Servicios a promocionar">
        <div className="grid sm:grid-cols-2 gap-1.5">
          {SERVICES.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm text-ink/80 bg-mist rounded-lg px-3 py-2 cursor-pointer">
              <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => toggleService(s.id)} className="w-4 h-4 accent-[var(--color-gold)]" />
              {s.title}
            </label>
          ))}
        </div>
      </Field>

      <Field label="Título / promoción"><input className={inputCls} value={promoTitle} onChange={(e) => setPromoTitle(e.target.value)} placeholder="Ej. Fall Special — 15% off" /></Field>

      <Field label="Formato">
        <div className="grid grid-cols-3 gap-2">
          {CONFIG_FORMATS.map((f) => (
            <button key={f.id} type="button" onClick={() => setFormat(f.id)} className={`h-14 rounded-lg border-2 text-xs font-bold px-2 ${format === f.id ? 'border-gold bg-gold/15 text-ink' : 'border-ink/15 text-ink/60 hover:border-ink/30'}`}>{f.label}</button>
          ))}
        </div>
      </Field>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-ink/80"><input type="checkbox" checked={showPhone} onChange={(e) => setShowPhone(e.target.checked)} className="w-4 h-4 accent-[var(--color-gold)]" /> Mostrar teléfono</label>
        <label className="flex items-center gap-2 text-sm text-ink/80"><input type="checkbox" checked={showWebsite} onChange={(e) => setShowWebsite(e.target.checked)} className="w-4 h-4 accent-[var(--color-gold)]" /> Mostrar website</label>
      </div>

      <button onClick={generateAdvertising} className="mt-2 inline-flex items-center justify-center gap-2 h-12 rounded-full bg-gold text-ink font-bold"><Icon name="tag" size={16} /> Generate Advertising</button>

      {flyerDoc && <DocModal title={flyerDoc.title} html={flyerDoc.html} onClose={() => setFlyerDoc(null)} />}
    </div>
  )
}

function SocialEditor({ init, onBack }) {
  const canvasRef = useRef(null)
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id)
  const [title, setTitle] = useState(init.title)
  const [subtitle, setSubtitle] = useState(init.subtitle)
  const [cta, setCta] = useState(init.cta)
  const [photoImg, setPhotoImg] = useState(null)
  const [ready, setReady] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const format = FORMATS.find((f) => f.id === init.formatId) || FORMATS[0]

  useEffect(() => {
    let cancelled = false
    loadLogo().then((logoImg) => {
      if (cancelled) return
      draw(canvasRef.current, { format, template: templateId, photoImg, logoImg, title, subtitle, cta }).then(() => setReady(true))
    })
    return () => { cancelled = true }
  }, [format, templateId, photoImg, title, subtitle, cta])

  async function onPhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const img = await loadFile(file)
    setPhotoImg(img)
  }

  function download() {
    const canvas = canvasRef.current
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `${BUSINESS.replace(/\s+/g, '-')}-${format.id}.png`
    a.click()
  }

  return (
    <div>
      <button onClick={onBack} className="mb-4 text-sm font-bold text-ink hover:underline">← Cambiar configuración</button>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white border border-ink/10 p-5 grid gap-3.5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/50">{format.label}</p>
          <Field label="Plantilla">
            <div className="grid grid-cols-3 gap-2">
              {TEMPLATES.map((t) => (
                <button key={t.id} type="button" onClick={() => setTemplateId(t.id)} className={`h-11 rounded-lg border-2 text-xs font-bold ${templateId === t.id ? 'border-gold bg-gold/15 text-ink' : 'border-ink/15 text-ink/60 hover:border-ink/30'}`}>{t.label}</button>
              ))}
            </div>
          </Field>
          <Field label="Foto">
            <label className="flex items-center gap-2 h-11 px-3 rounded-lg border border-ink/20 cursor-pointer text-sm font-semibold text-ink/70 hover:border-ink">
              <Icon name="image" size={16} /> {photoImg ? 'Cambiar foto…' : 'Subir foto…'}
              <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
            </label>
          </Field>
          <Field label="Título"><textarea rows="2" className={`${inputCls} w-full h-auto py-2`} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Subtítulo"><textarea rows="2" className={`${inputCls} w-full h-auto py-2`} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} /></Field>
          <Field label="Llamado a la acción"><input className={inputCls} value={cta} onChange={(e) => setCta(e.target.value)} /></Field>
          <button onClick={() => setModalOpen(true)} disabled={!ready} className="mt-2 inline-flex items-center justify-center gap-2 h-12 rounded-full bg-gold text-ink font-bold disabled:opacity-60"><Icon name="tag" size={16} /> Generar imagen</button>
        </div>

        <div className="rounded-2xl bg-mist border border-ink/10 p-5 grid place-items-center">
          <canvas ref={canvasRef} className="max-w-full rounded-lg shadow-sm" style={{ width: '100%', maxWidth: format.w >= format.h ? 380 : 260, height: 'auto' }} />
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4" onClick={() => setModalOpen(false)}>
          <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 h-14 border-b border-ink/10">
              <h3 className="font-bold text-ink">Publicidad lista</h3>
              <button onClick={() => setModalOpen(false)} aria-label="Cerrar" className="grid place-items-center w-8 h-8 rounded-full border border-ink/15 hover:border-ink"><Icon name="x" size={16} /></button>
            </div>
            <div className="p-6 grid gap-3">
              <img src={canvasRef.current?.toDataURL('image/png')} alt="Vista previa" className="rounded-xl border border-ink/10 max-h-64 object-contain mx-auto" />
              <button onClick={download} className="h-14 rounded-xl bg-gold text-ink font-bold flex items-center justify-center gap-2"><Icon name="arrowRight" size={18} /> Descargar imagen</button>
              <button onClick={() => setModalOpen(false)} className="h-11 rounded-lg border border-ink/20 font-bold text-sm">← Volver al editor</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
