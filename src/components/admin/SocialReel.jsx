import { useEffect, useRef, useState } from 'react'
import { BUSINESS, PHONE_DISPLAY } from '../../content'
import Icon from '../Icon'
import { Field, inputCls } from './shared'
import logoWhite from '../../assets/photos/logo-white.webp'

const WEBSITE = 'gutierrez-generalservices.web.app'
const NAVY = '#123b55'
const GOLD = '#f3c64e'

// Fixed on purpose — the whole point is "always the same format", not a picker.
const FORMAT = { w: 1080, h: 1920 }
const INTRO_DUR = 1.4
const OUTRO_DUR = 2.2
const TRANSITION_DUR = 0.5
const FPS = 30

const STYLES = [
  { id: 'fade', label: 'Fade' },
  { id: 'zoom', label: 'Zoom' },
  { id: 'slide', label: 'Slide' },
]

const LABELS = {
  es: { kicker: 'CUIDADO LOCAL · WARSAW, IN', cta: 'Cotización gratis' },
  en: { kicker: 'LOCAL CARE · WARSAW, IN', cta: 'Get a Free Quote' },
}

let logoImgPromise = null
function loadLogo() {
  if (!logoImgPromise) {
    logoImgPromise = new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = logoWhite
    })
  }
  return logoImgPromise
}

function loadImageFile(file) {
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

function pickMimeType() {
  // MP4 excluded on purpose: this browser's native canvas→MP4 (H.264) recording path
  // produced solid-green color corruption partway through test renders. WebM's VP8/VP9
  // path rendered clean, so we stick to it even though the user asked for MP4 downstream.
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ]
  for (const type of candidates) {
    if (window.MediaRecorder?.isTypeSupported?.(type)) return type
  }
  return ''
}

// Cover-fit crop with an optional zoom-in over time (Ken Burns), centered.
function drawCoverZoom(ctx, img, w, h, zoomT) {
  const ir = img.width / img.height
  const r = w / h
  let sw, sh
  if (ir > r) { sh = img.height; sw = sh * r } else { sw = img.width; sh = sw / r }
  const zoom = 1 + 0.1 * Math.max(0, Math.min(zoomT, 1))
  sw /= zoom
  sh /= zoom
  const sx = (img.width - sw) / 2
  const sy = (img.height - sh) / 2
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h)
}

function drawIntro(ctx, w, h, localT, logoImg, lang) {
  ctx.fillStyle = NAVY
  ctx.fillRect(0, 0, w, h)
  const fadeIn = Math.min(localT / 0.4, 1)
  ctx.save()
  ctx.globalAlpha = fadeIn
  ctx.textAlign = 'center'
  ctx.font = `800 ${Math.round(w * 0.032)}px Manrope, sans-serif`
  ctx.fillStyle = GOLD
  ctx.fillText(LABELS[lang].kicker, w / 2, h * 0.42)
  if (logoImg) {
    const lw = w * 0.5
    const lh = lw * (logoImg.height / logoImg.width)
    ctx.drawImage(logoImg, (w - lw) / 2, h * 0.46, lw, lh)
  }
  ctx.restore()
}

function drawOutro(ctx, w, h, localT, logoImg, lang) {
  ctx.fillStyle = NAVY
  ctx.fillRect(0, 0, w, h)
  const fadeIn = Math.min(localT / 0.4, 1)
  ctx.save()
  ctx.globalAlpha = fadeIn
  ctx.textAlign = 'center'
  if (logoImg) {
    const lw = w * 0.42
    const lh = lw * (logoImg.height / logoImg.width)
    ctx.drawImage(logoImg, (w - lw) / 2, h * 0.36, lw, lh)
  }
  ctx.font = `700 ${Math.round(w * 0.03)}px Manrope, sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fillText(PHONE_DISPLAY, w / 2, h * 0.55)
  ctx.fillText(WEBSITE, w / 2, h * 0.585)
  ctx.font = `800 ${Math.round(w * 0.036)}px Manrope, sans-serif`
  ctx.fillStyle = GOLD
  ctx.fillText(LABELS[lang].cta, w / 2, h * 0.66)
  ctx.restore()
}

function buildSlides(photos, slotDur, introOutroOn) {
  const slides = []
  if (introOutroOn) slides.push({ kind: 'intro', dur: INTRO_DUR })
  photos.forEach((p) => slides.push({ kind: 'photo', dur: slotDur, photo: p }))
  if (introOutroOn) slides.push({ kind: 'outro', dur: OUTRO_DUR })
  return slides
}

function drawSlide(ctx, slide, localT, w, h, logoImg, lang, zoomOn) {
  if (slide.kind === 'intro') return drawIntro(ctx, w, h, localT, logoImg, lang)
  if (slide.kind === 'outro') return drawOutro(ctx, w, h, localT, logoImg, lang)
  if (slide.photo?.img) drawCoverZoom(ctx, slide.photo.img, w, h, zoomOn ? localT / slide.dur : 0)
  else { ctx.fillStyle = '#dfeef5'; ctx.fillRect(0, 0, w, h) }
}

function renderFrame(ctx, slides, time, w, h, logoImg, lang, style) {
  ctx.clearRect(0, 0, w, h)
  let acc = 0
  let idx = slides.length - 1
  for (let i = 0; i < slides.length; i++) {
    if (time < acc + slides[i].dur) { idx = i; break }
    acc += slides[i].dur
  }
  const slide = slides[idx]
  const localT = time - acc
  const hasNext = idx < slides.length - 1
  const transitionStart = slide.dur - TRANSITION_DUR
  const zoomOn = style === 'zoom'

  if (hasNext && localT >= transitionStart) {
    const f = Math.min((localT - transitionStart) / TRANSITION_DUR, 1)
    if (style === 'slide') {
      ctx.save(); ctx.translate(-w * f, 0); drawSlide(ctx, slide, localT, w, h, logoImg, lang, false); ctx.restore()
      ctx.save(); ctx.translate(w * (1 - f), 0); drawSlide(ctx, slides[idx + 1], 0, w, h, logoImg, lang, false); ctx.restore()
    } else {
      drawSlide(ctx, slide, localT, w, h, logoImg, lang, zoomOn)
      ctx.save()
      ctx.globalAlpha = f
      drawSlide(ctx, slides[idx + 1], 0, w, h, logoImg, lang, zoomOn)
      ctx.restore()
    }
  } else {
    drawSlide(ctx, slide, localT, w, h, logoImg, lang, zoomOn)
  }
}

function OptionRow({ options, value, onChange, labels }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)} className={`h-9 px-3.5 rounded-full border text-xs font-bold ${value === o ? 'border-gold bg-gold/15 text-ink' : 'border-ink/15 text-ink/60 hover:border-ink/30'}`}>
          {labels ? labels[o] : o}
        </button>
      ))}
    </div>
  )
}

export default function SocialReel() {
  const canvasRef = useRef(null)
  const previewRafRef = useRef(null)

  const [photos, setPhotos] = useState([])
  const [duration, setDuration] = useState(2.5)
  const [style, setStyle] = useState('fade')
  const [lang, setLang] = useState('es')
  const [introOutroOn, setIntroOutroOn] = useState(true)
  const [logoImg, setLogoImg] = useState(null)
  // Starts past the intro's own fade-in (0–0.4s) so the default preview isn't a blank navy
  // rectangle — the very first instant of that fade is 0% opacity by design.
  const [scrub, setScrub] = useState(0.6)

  const [isRendering, setIsRendering] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null) // { url, ext }

  useEffect(() => { loadLogo().then(setLogoImg) }, [])

  const slides = buildSlides(photos, duration, introOutroOn)
  const totalDuration = slides.reduce((sum, s) => sum + s.dur, 0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || isRendering) return
    canvas.width = FORMAT.w
    canvas.height = FORMAT.h
    const ctx = canvas.getContext('2d')
    const t = Math.min(scrub, Math.max(totalDuration - 0.001, 0))
    if (slides.length === 0) { ctx.fillStyle = '#dfeef5'; ctx.fillRect(0, 0, FORMAT.w, FORMAT.h); return }
    renderFrame(ctx, slides, t, FORMAT.w, FORMAT.h, logoImg, lang, style)
  }, [photos, duration, style, lang, introOutroOn, logoImg, scrub, isRendering, totalDuration, slides])

  async function onUpload(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const loaded = await Promise.all(files.map(async (f) => ({ id: `${Date.now()}-${Math.random()}`, img: await loadImageFile(f), name: f.name })))
    setPhotos((ps) => [...ps, ...loaded])
    e.target.value = ''
  }
  function removePhoto(id) { setPhotos((ps) => ps.filter((p) => p.id !== id)) }
  function movePhoto(id, dir) {
    setPhotos((ps) => {
      const i = ps.findIndex((p) => p.id === id)
      const j = i + dir
      if (j < 0 || j >= ps.length) return ps
      const next = [...ps]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  async function generate() {
    if (photos.length === 0) return
    setResult(null)
    setIsRendering(true)
    setProgress(0)
    const canvas = canvasRef.current
    canvas.width = FORMAT.w
    canvas.height = FORMAT.h
    const ctx = canvas.getContext('2d')
    try { await document.fonts.load(`800 60px Manrope`); await document.fonts.ready } catch { /* fall back to default font */ }

    const mimeType = pickMimeType()
    const stream = canvas.captureStream(FPS)
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 8_000_000 } : undefined)
    const chunks = []
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }

    const finished = new Promise((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType || 'video/webm' })
        const ext = (mimeType || '').includes('mp4') ? 'mp4' : 'webm'
        resolve({ url: URL.createObjectURL(blob), ext })
      }
    })

    recorder.start()
    const startedAt = performance.now()
    await new Promise((resolveLoop) => {
      // setTimeout, not requestAnimationFrame — rAF fully stops in a hidden/backgrounded
      // tab, which would leave "Generando…" stuck forever if the staff member switches
      // tabs mid-render. setTimeout keeps firing (just throttled) so it still finishes.
      function tick() {
        const elapsed = (performance.now() - startedAt) / 1000
        renderFrame(ctx, slides, Math.min(elapsed, totalDuration), FORMAT.w, FORMAT.h, logoImg, lang, style)
        setProgress(Math.min(elapsed / totalDuration, 1))
        if (elapsed < totalDuration) { previewRafRef.current = setTimeout(tick, 1000 / FPS) }
        else resolveLoop()
      }
      previewRafRef.current = setTimeout(tick, 0)
    })
    recorder.stop()
    const out = await finished
    setResult(out)
    setIsRendering(false)
  }

  return (
    <div className="grid lg:grid-cols-[380px_1fr] gap-5 items-start">
      {/* min-w-0: a grid item's default min-width is "auto" (its content's natural minimum),
          which can override a fixed-px track and let long filenames/other content push this
          column wider than 380px into the preview column — min-w-0 lets it actually shrink. */}
      <div className="grid gap-3.5 order-2 lg:order-1 min-w-0">
        <div className="rounded-2xl bg-white border border-ink/10 p-4 grid gap-3.5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-ink/70">Fotos ({photos.length})</p>
          <label className="flex items-center justify-center gap-2 h-11 px-3 rounded-lg border border-ink/20 cursor-pointer text-sm font-semibold text-ink/70 hover:border-ink">
            <Icon name="image" size={16} /> Agregar fotos…
            <input type="file" accept="image/*" multiple className="hidden" onChange={onUpload} />
          </label>
          {photos.length > 0 && (
            <div className="grid gap-1.5 overflow-hidden">
              {photos.map((p, i) => (
                <div key={p.id} className="grid gap-1.5 rounded-lg border border-ink/10 p-1.5 overflow-hidden">
                  <div className="flex items-center gap-2 min-w-0">
                    <img src={p.img.src} alt="" className="w-10 h-14 object-cover rounded shrink-0" />
                    <span className="flex-1 min-w-0 text-xs text-ink/70 truncate" title={p.name}>{i + 1}. {p.name}</span>
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    <button type="button" onClick={() => movePhoto(p.id, -1)} disabled={i === 0} aria-label="Subir" className="grid place-items-center w-8 h-8 rounded-md border border-ink/15 disabled:opacity-30 hover:border-ink/30 shrink-0"><Icon name="arrowRight" size={13} className="-rotate-90" /></button>
                    <button type="button" onClick={() => movePhoto(p.id, 1)} disabled={i === photos.length - 1} aria-label="Bajar" className="grid place-items-center w-8 h-8 rounded-md border border-ink/15 disabled:opacity-30 hover:border-ink/30 shrink-0"><Icon name="arrowRight" size={13} className="rotate-90" /></button>
                    <button type="button" onClick={() => removePhoto(p.id)} aria-label="Eliminar" className="grid place-items-center w-8 h-8 rounded-md border border-ink/15 hover:border-red-600 hover:text-red-600 shrink-0"><Icon name="trash" size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white border border-ink/10 p-4 grid gap-3.5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-ink/70">Formato del reel</p>
          <Field label={`Duración por foto — ${duration.toFixed(1)}s`}>
            <input type="range" min="1.5" max="5" step="0.1" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full accent-[var(--color-gold)]" />
          </Field>
          <Field label="Estilo de transición">
            <OptionRow options={STYLES.map((s) => s.id)} value={style} onChange={setStyle} labels={Object.fromEntries(STYLES.map((s) => [s.id, s.label]))} />
          </Field>
          <Field label="Idioma de marca (intro/outro)">
            <OptionRow options={['es', 'en']} value={lang} onChange={setLang} labels={{ es: 'Español', en: 'English' }} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-ink/80">
            <input type="checkbox" checked={introOutroOn} onChange={(e) => setIntroOutroOn(e.target.checked)} className="w-4 h-4 accent-[var(--color-gold)]" />
            Incluir intro y outro de marca
          </label>
          <p className="text-[11px] text-ink/40">1080×1920 vertical, siempre el mismo formato · duración total: {totalDuration.toFixed(1)}s</p>
        </div>

        <div className="rounded-2xl bg-white border border-ink/10 p-4 grid gap-3.5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-ink/70">Generar</p>
          <p className="text-[11px] text-ink/50">La grabación toma el mismo tiempo que dura el video (no se puede acelerar) — se hace en tu navegador, sin subir nada a internet.</p>
          <button onClick={generate} disabled={photos.length === 0 || isRendering} className="inline-flex items-center justify-center gap-2 h-12 rounded-full bg-gold text-ink font-bold disabled:opacity-40">
            {isRendering ? `Generando… ${Math.round(progress * 100)}%` : <><Icon name="arrowRight" size={16} /> Generar video</>}
          </button>
          {isRendering && (
            <div className="h-2 rounded-full bg-mist overflow-hidden"><div className="h-full bg-gold transition-[width]" style={{ width: `${progress * 100}%` }} /></div>
          )}
          {result && (
            <div className="grid gap-2 border-t border-ink/10 pt-3">
              <video src={result.url} controls className="w-full rounded-lg bg-ink" style={{ aspectRatio: `${FORMAT.w} / ${FORMAT.h}` }} />
              <a href={result.url} download={`reel-gutierrez-${Date.now()}.${result.ext}`} className="inline-flex items-center justify-center gap-2 h-11 rounded-full border border-ink/20 font-bold text-sm hover:border-ink">
                <Icon name="arrowRight" size={15} /> Descargar {result.ext.toUpperCase()}
              </a>
              <p className="text-[11px] text-ink/40">Sale en WebM a propósito — el MP4 nativo del navegador dañaba el color en video largos. ChatGPT y la mayoría de herramientas de edición aceptan WebM sin problema.</p>
            </div>
          )}
        </div>
      </div>

      <div className="order-1 lg:order-2 lg:sticky lg:top-4 grid gap-3 place-items-center rounded-2xl bg-mist border border-ink/10 p-6">
        <div style={{ width: '100%', maxWidth: 300 }}>
          <canvas ref={canvasRef} className="w-full rounded-lg shadow-sm" style={{ aspectRatio: `${FORMAT.w} / ${FORMAT.h}` }} />
        </div>
        {!isRendering && (
          <div className="w-full" style={{ maxWidth: 300 }}>
            <input type="range" min="0" max={Math.max(totalDuration - 0.05, 0)} step="0.05" value={scrub} onChange={(e) => setScrub(Number(e.target.value))} className="w-full accent-[var(--color-gold)]" />
            <p className="text-center text-[11px] text-ink/40 mt-1">Vista previa — arrastra para revisar antes de generar</p>
          </div>
        )}
      </div>
    </div>
  )
}
