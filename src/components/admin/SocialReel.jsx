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
const MAX_VIDEO_CLIP = 10 // seconds, safety cap on a single trimmed clip

const STYLES = [
  { id: 'fade', label: 'Fade' },
  { id: 'zoom', label: 'Zoom' },
  { id: 'slide', label: 'Slide' },
]

const BRAND_STYLES = [
  { id: 'clasico', label: 'Clásico' },
  { id: 'bold', label: 'Bold' },
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

function loadVideoFile(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const videoEl = document.createElement('video')
    videoEl.src = url
    videoEl.muted = true
    videoEl.playsInline = true
    videoEl.preload = 'auto'
    videoEl.onloadedmetadata = () => {
      const srcDuration = videoEl.duration || 0
      resolve({ videoEl, srcDuration, trimStart: 0, trimEnd: Math.min(srcDuration, MAX_VIDEO_CLIP) })
    }
    videoEl.onerror = () => resolve({ videoEl, srcDuration: 0, trimStart: 0, trimEnd: 0 })
  })
}

function loadClip(file) {
  const id = `${Date.now()}-${Math.random()}`
  const name = file.name
  if (file.type.startsWith('video/')) {
    return loadVideoFile(file).then((v) => ({ id, kind: 'video', name, ...v }))
  }
  return loadImageFile(file).then((img) => ({ id, kind: 'photo', name, img }))
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

function naturalSize(source) {
  if (typeof HTMLVideoElement !== 'undefined' && source instanceof HTMLVideoElement) return { w: source.videoWidth, h: source.videoHeight }
  return { w: source.width, h: source.height }
}

// Cover-fit crop with an optional zoom-in over time (Ken Burns), centered. Works for an
// <img> or a live <video> frame — both are valid canvas drawImage sources.
function drawCoverZoom(ctx, source, w, h, zoomT) {
  const { w: iw, h: ih } = naturalSize(source)
  if (!iw || !ih) return
  const ir = iw / ih
  const r = w / h
  let sw, sh
  if (ir > r) { sh = ih; sw = sh * r } else { sw = iw; sh = sw / r }
  const zoom = 1 + 0.1 * Math.max(0, Math.min(zoomT, 1))
  sw /= zoom
  sh /= zoom
  const sx = (iw - sw) / 2
  const sy = (ih - sh) / 2
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, w, h)
}

function wrapLines(ctx, text, maxWidth) {
  const words = (text || '').split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word }
    else line = test
  }
  if (line) lines.push(line)
  return lines
}

function fitWrappedText(ctx, text, weight, baseSize, minSize, maxWidth, maxLines) {
  let size = baseSize
  let lines = []
  for (let tries = 0; tries < 40; tries++) {
    ctx.font = `${weight} ${Math.round(size)}px Manrope, sans-serif`
    lines = wrapLines(ctx, text, maxWidth)
    const widest = lines.reduce((m, l) => Math.max(m, ctx.measureText(l).width), 0)
    if ((widest <= maxWidth && lines.length <= maxLines) || size <= minSize) break
    size -= 1
  }
  if (lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] += '…' }
  return { size, lines }
}

// Bold caption overlay for the opening/closing hook line, with a soft scrim behind it so it
// reads over any photo or video frame.
function drawOverlayText(ctx, w, h, text, pos) {
  if (!text) return
  const pad = w * 0.08
  const bandH = h * 0.26
  const bandY = pos === 'top' ? 0 : h - bandH
  const grad = ctx.createLinearGradient(0, bandY, 0, pos === 'top' ? bandY + bandH : h)
  const solid = 'rgba(18,59,85,0.6)'
  const clear = 'rgba(18,59,85,0)'
  grad.addColorStop(0, pos === 'top' ? solid : clear)
  grad.addColorStop(1, pos === 'top' ? clear : solid)
  ctx.fillStyle = grad
  ctx.fillRect(0, bandY, w, bandH)

  ctx.textAlign = 'center'
  ctx.fillStyle = '#fff'
  const { size, lines } = fitWrappedText(ctx, text, 800, w * 0.058, w * 0.032, w - pad * 2, 3)
  const lineH = size * 1.18
  const centerY = pos === 'top' ? bandY + bandH * 0.42 : bandY + bandH * 0.58
  const startY = centerY - ((lines.length - 1) * lineH) / 2
  ctx.font = `800 ${Math.round(size)}px Manrope, sans-serif`
  lines.forEach((l, i) => ctx.fillText(l, w / 2, startY + i * lineH))
}

function drawIntro(ctx, w, h, localT, logoImg, lang, brandStyle) {
  ctx.fillStyle = NAVY
  ctx.fillRect(0, 0, w, h)
  const fadeIn = Math.min(localT / 0.4, 1)
  ctx.save()
  ctx.globalAlpha = fadeIn
  ctx.textAlign = 'center'
  if (brandStyle === 'bold') {
    if (logoImg) {
      const lw = w * 0.56
      const lh = lw * (logoImg.height / logoImg.width)
      ctx.drawImage(logoImg, (w - lw) / 2, h * 0.36, lw, lh)
    }
    ctx.fillStyle = GOLD
    ctx.fillRect(w * 0.32, h * 0.52, w * 0.36, h * 0.004)
    ctx.font = `800 ${Math.round(w * 0.03)}px Manrope, sans-serif`
    ctx.fillText(LABELS[lang].kicker, w / 2, h * 0.57)
  } else {
    ctx.font = `800 ${Math.round(w * 0.032)}px Manrope, sans-serif`
    ctx.fillStyle = GOLD
    ctx.fillText(LABELS[lang].kicker, w / 2, h * 0.42)
    if (logoImg) {
      const lw = w * 0.5
      const lh = lw * (logoImg.height / logoImg.width)
      ctx.drawImage(logoImg, (w - lw) / 2, h * 0.46, lw, lh)
    }
  }
  ctx.restore()
}

function drawOutro(ctx, w, h, localT, logoImg, lang, brandStyle) {
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
  if (brandStyle === 'bold') {
    const label = LABELS[lang].cta
    ctx.font = `800 ${Math.round(w * 0.032)}px Manrope, sans-serif`
    const textW = ctx.measureText(label).width
    const padX = w * 0.05
    const pillW = textW + padX * 2
    const pillH = w * 0.09
    const pillX = (w - pillW) / 2
    const pillY = h * 0.63
    ctx.beginPath()
    ctx.moveTo(pillX + pillH / 2, pillY)
    ctx.arcTo(pillX + pillW, pillY, pillX + pillW, pillY + pillH, pillH / 2)
    ctx.arcTo(pillX + pillW, pillY + pillH, pillX, pillY + pillH, pillH / 2)
    ctx.arcTo(pillX, pillY + pillH, pillX, pillY, pillH / 2)
    ctx.arcTo(pillX, pillY, pillX + pillW, pillY, pillH / 2)
    ctx.closePath()
    ctx.fillStyle = GOLD
    ctx.fill()
    ctx.fillStyle = NAVY
    ctx.fillText(label, w / 2, pillY + pillH * 0.66)
  } else {
    ctx.font = `800 ${Math.round(w * 0.036)}px Manrope, sans-serif`
    ctx.fillStyle = GOLD
    ctx.fillText(LABELS[lang].cta, w / 2, h * 0.66)
  }
  ctx.restore()
}

function buildSlides(clips, photoDuration, introOutroOn) {
  const slides = []
  if (introOutroOn) slides.push({ kind: 'intro', dur: INTRO_DUR })
  clips.forEach((c, i) => {
    const dur = c.kind === 'video' ? Math.max(0.2, c.trimEnd - c.trimStart) : photoDuration
    slides.push({ kind: 'clip', dur, clip: c, isFirst: i === 0, isLast: i === clips.length - 1 })
  })
  if (introOutroOn) slides.push({ kind: 'outro', dur: OUTRO_DUR })
  return slides
}

function drawSlide(ctx, slide, localT, w, h, logoImg, lang, zoomOn, brandStyle, startText, endText) {
  if (slide.kind === 'intro') return drawIntro(ctx, w, h, localT, logoImg, lang, brandStyle)
  if (slide.kind === 'outro') return drawOutro(ctx, w, h, localT, logoImg, lang, brandStyle)
  const c = slide.clip
  if (c.kind === 'video' && c.videoEl && c.videoEl.readyState >= 2) drawCoverZoom(ctx, c.videoEl, w, h, 0)
  else if (c.kind === 'photo' && c.img) drawCoverZoom(ctx, c.img, w, h, zoomOn ? localT / slide.dur : 0)
  else { ctx.fillStyle = '#dfeef5'; ctx.fillRect(0, 0, w, h) }
  if (slide.isFirst && startText) drawOverlayText(ctx, w, h, startText, 'top')
  if (slide.isLast && endText) drawOverlayText(ctx, w, h, endText, 'bottom')
}

function renderFrame(ctx, slides, time, w, h, logoImg, lang, style, brandStyle, startText, endText) {
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
      ctx.save(); ctx.translate(-w * f, 0); drawSlide(ctx, slide, localT, w, h, logoImg, lang, false, brandStyle, startText, endText); ctx.restore()
      ctx.save(); ctx.translate(w * (1 - f), 0); drawSlide(ctx, slides[idx + 1], 0, w, h, logoImg, lang, false, brandStyle, startText, endText); ctx.restore()
    } else {
      drawSlide(ctx, slide, localT, w, h, logoImg, lang, zoomOn, brandStyle, startText, endText)
      ctx.save()
      ctx.globalAlpha = f
      drawSlide(ctx, slides[idx + 1], 0, w, h, logoImg, lang, zoomOn, brandStyle, startText, endText)
      ctx.restore()
    }
  } else {
    drawSlide(ctx, slide, localT, w, h, logoImg, lang, zoomOn, brandStyle, startText, endText)
  }
  return { slide, localT }
}

// Keeps each video clip's own element playing only while its slide is the active one, seeked
// to its trim-in point — natural playback (not per-frame seeking) is what keeps it in sync
// with the real-time recording loop without stutter.
function syncVideoPlayback(clips, activeClip, videoStateRef) {
  clips.forEach((c) => {
    if (c.kind !== 'video') return
    const state = videoStateRef.current[c.id] || {}
    const isActive = activeClip && activeClip.id === c.id
    if (isActive && !state.started) {
      try { c.videoEl.currentTime = c.trimStart } catch { /* ignore seek race */ }
      c.videoEl.play().catch(() => {})
      videoStateRef.current[c.id] = { started: true }
    } else if (!isActive && state.started) {
      c.videoEl.pause()
      videoStateRef.current[c.id] = { started: false }
    }
  })
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
  const videoStateRef = useRef({})

  const [clips, setClips] = useState([])
  const [duration, setDuration] = useState(2.5)
  const [style, setStyle] = useState('fade')
  const [brandStyle, setBrandStyle] = useState('clasico')
  const [lang, setLang] = useState('es')
  const [introOutroOn, setIntroOutroOn] = useState(true)
  const [startText, setStartText] = useState('')
  const [endText, setEndText] = useState('')
  const [logoImg, setLogoImg] = useState(null)
  // Starts past the intro's own fade-in (0–0.4s) so the default preview isn't a blank navy
  // rectangle — the very first instant of that fade is 0% opacity by design.
  const [scrub, setScrub] = useState(0.6)

  const [isRendering, setIsRendering] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null) // { url, ext }

  useEffect(() => { loadLogo().then(setLogoImg) }, [])

  const slides = buildSlides(clips, duration, introOutroOn)
  const totalDuration = slides.reduce((sum, s) => sum + s.dur, 0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || isRendering) return
    canvas.width = FORMAT.w
    canvas.height = FORMAT.h
    const ctx = canvas.getContext('2d')
    const t = Math.min(scrub, Math.max(totalDuration - 0.001, 0))
    if (slides.length === 0) { ctx.fillStyle = '#dfeef5'; ctx.fillRect(0, 0, FORMAT.w, FORMAT.h); return }
    const { slide, localT } = renderFrame(ctx, slides, t, FORMAT.w, FORMAT.h, logoImg, lang, style, brandStyle, startText, endText)
    if (slide.kind === 'clip' && slide.clip.kind === 'video' && slide.clip.videoEl) {
      try { slide.clip.videoEl.currentTime = slide.clip.trimStart + localT } catch { /* ignore seek race */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clips, duration, style, brandStyle, lang, introOutroOn, startText, endText, logoImg, scrub, isRendering, totalDuration, slides])

  async function onUpload(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const loaded = await Promise.all(files.map(loadClip))
    setClips((cs) => [...cs, ...loaded])
    e.target.value = ''
  }
  function removeClip(id) { setClips((cs) => cs.filter((c) => c.id !== id)) }
  function moveClip(id, dir) {
    setClips((cs) => {
      const i = cs.findIndex((c) => c.id === id)
      const j = i + dir
      if (j < 0 || j >= cs.length) return cs
      const next = [...cs]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }
  function updateTrim(id, field, value) {
    setClips((cs) => cs.map((c) => {
      if (c.id !== id) return c
      const clamped = Math.max(0, Math.min(value, c.srcDuration))
      const next = { ...c, [field]: clamped }
      if (next.trimEnd - next.trimStart > MAX_VIDEO_CLIP) {
        if (field === 'trimStart') next.trimEnd = Math.min(c.srcDuration, next.trimStart + MAX_VIDEO_CLIP)
        else next.trimStart = Math.max(0, next.trimEnd - MAX_VIDEO_CLIP)
      }
      if (next.trimEnd <= next.trimStart) {
        if (field === 'trimStart') next.trimStart = Math.max(0, next.trimEnd - 0.2)
        else next.trimEnd = Math.min(c.srcDuration, next.trimStart + 0.2)
      }
      return next
    }))
  }

  async function generate() {
    if (clips.length === 0) return
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
        const { slide } = renderFrame(ctx, slides, Math.min(elapsed, totalDuration), FORMAT.w, FORMAT.h, logoImg, lang, style, brandStyle, startText, endText)
        const activeClip = slide.kind === 'clip' ? slide.clip : null
        syncVideoPlayback(clips, activeClip, videoStateRef)
        setProgress(Math.min(elapsed / totalDuration, 1))
        if (elapsed < totalDuration) { previewRafRef.current = setTimeout(tick, 1000 / FPS) }
        else resolveLoop()
      }
      previewRafRef.current = setTimeout(tick, 0)
    })
    recorder.stop()
    clips.forEach((c) => { if (c.kind === 'video') c.videoEl.pause() })
    videoStateRef.current = {}
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
          <p className="text-xs font-extrabold uppercase tracking-wide text-ink/70">Fotos y videos ({clips.length})</p>
          <label className="flex items-center justify-center gap-2 h-11 px-3 rounded-lg border border-ink/20 cursor-pointer text-sm font-semibold text-ink/70 hover:border-ink">
            <Icon name="image" size={16} /> Agregar fotos o videos…
            <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={onUpload} />
          </label>
          {clips.length > 0 && (
            <div className="grid gap-1.5 overflow-hidden">
              {clips.map((c, i) => (
                <div key={c.id} className="grid gap-1.5 rounded-lg border border-ink/10 p-1.5 overflow-hidden">
                  <div className="flex items-center gap-2 min-w-0">
                    {c.kind === 'video'
                      ? <div className="w-10 h-14 rounded bg-ink/80 grid place-items-center shrink-0"><Icon name="play" size={16} className="text-white" /></div>
                      : <img src={c.img.src} alt="" className="w-10 h-14 object-cover rounded shrink-0" />}
                    <span className="flex-1 min-w-0 text-xs text-ink/70 truncate" title={c.name}>{i + 1}. {c.name}</span>
                  </div>
                  {c.kind === 'video' && (
                    <div className="flex items-center gap-1.5 text-[11px] text-ink/60 flex-wrap">
                      <span>Recorte:</span>
                      <input type="number" min="0" max={c.trimEnd} step="0.1" value={c.trimStart} onChange={(e) => updateTrim(c.id, 'trimStart', Number(e.target.value))} className="w-14 h-7 rounded border border-ink/15 px-1.5" />
                      <span>–</span>
                      <input type="number" min={c.trimStart} max={c.srcDuration} step="0.1" value={c.trimEnd} onChange={(e) => updateTrim(c.id, 'trimEnd', Number(e.target.value))} className="w-14 h-7 rounded border border-ink/15 px-1.5" />
                      <span>de {c.srcDuration.toFixed(1)}s</span>
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-1.5">
                    <button type="button" onClick={() => moveClip(c.id, -1)} disabled={i === 0} aria-label="Subir" className="grid place-items-center w-8 h-8 rounded-md border border-ink/15 disabled:opacity-30 hover:border-ink/30 shrink-0"><Icon name="arrowRight" size={13} className="-rotate-90" /></button>
                    <button type="button" onClick={() => moveClip(c.id, 1)} disabled={i === clips.length - 1} aria-label="Bajar" className="grid place-items-center w-8 h-8 rounded-md border border-ink/15 disabled:opacity-30 hover:border-ink/30 shrink-0"><Icon name="arrowRight" size={13} className="rotate-90" /></button>
                    <button type="button" onClick={() => removeClip(c.id)} aria-label="Eliminar" className="grid place-items-center w-8 h-8 rounded-md border border-ink/15 hover:border-red-600 hover:text-red-600 shrink-0"><Icon name="trash" size={13} /></button>
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-ink/40">Los videos se incluyen sin audio propio — el audio y los subtítulos los agregas después en ChatGPT.</p>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white border border-ink/10 p-4 grid gap-3.5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-ink/70">Texto en pantalla</p>
          <Field label="Texto inicial (opcional)">
            <input className={inputCls} placeholder="Ej. 3 señales de que su césped necesita ayuda" value={startText} onChange={(e) => setStartText(e.target.value)} />
          </Field>
          <Field label="Texto final (opcional)">
            <input className={inputCls} placeholder="Ej. Escríbenos hoy" value={endText} onChange={(e) => setEndText(e.target.value)} />
          </Field>
          <p className="text-[11px] text-ink/40">Se muestran como gancho sobre la primera y la última foto o video — cortos funcionan mejor.</p>
        </div>

        <div className="rounded-2xl bg-white border border-ink/10 p-4 grid gap-3.5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-ink/70">Formato del reel</p>
          <Field label={`Duración por foto — ${duration.toFixed(1)}s (no aplica a videos)`}>
            <input type="range" min="1.5" max="5" step="0.1" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full accent-[var(--color-gold)]" />
          </Field>
          <Field label="Estilo de transición">
            <OptionRow options={STYLES.map((s) => s.id)} value={style} onChange={setStyle} labels={Object.fromEntries(STYLES.map((s) => [s.id, s.label]))} />
          </Field>
          <Field label="Estilo de intro/outro">
            <OptionRow options={BRAND_STYLES.map((s) => s.id)} value={brandStyle} onChange={setBrandStyle} labels={Object.fromEntries(BRAND_STYLES.map((s) => [s.id, s.label]))} />
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
          <button onClick={generate} disabled={clips.length === 0 || isRendering} className="inline-flex items-center justify-center gap-2 h-12 rounded-full bg-gold text-ink font-bold disabled:opacity-40">
            {isRendering ? `Generando… ${Math.round(progress * 100)}%` : <><Icon name="arrowRight" size={16} /> Generar video</>}
          </button>
          {isRendering && (
            <div className="h-2 rounded-full bg-mist overflow-hidden"><div className="h-full bg-gold transition-[width]" style={{ width: `${progress * 100}%` }} /></div>
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

      {result && (
        <div className="fixed inset-0 z-50 bg-ink/70 grid place-items-center p-4" onClick={() => setResult(null)}>
          <div className="rounded-2xl bg-white p-5 grid gap-3 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-extrabold text-ink">Tu reel está listo</p>
              <button onClick={() => setResult(null)} aria-label="Cerrar" className="grid place-items-center w-9 h-9 rounded-full border border-ink/15 hover:border-ink"><Icon name="x" size={16} /></button>
            </div>
            <video src={result.url} controls autoPlay className="w-full rounded-lg bg-ink" style={{ aspectRatio: `${FORMAT.w} / ${FORMAT.h}`, maxHeight: '65vh' }} />
            <a href={result.url} download={`reel-gutierrez-${Date.now()}.${result.ext}`} className="inline-flex items-center justify-center gap-2 h-11 rounded-full bg-gold text-ink font-bold text-sm">
              <Icon name="arrowRight" size={15} /> Descargar {result.ext.toUpperCase()}
            </a>
            <p className="text-[11px] text-ink/40">Sale en WebM a propósito — el MP4 nativo del navegador dañaba el color en videos largos. ChatGPT y la mayoría de herramientas de edición aceptan WebM sin problema.</p>
          </div>
        </div>
      )}
    </div>
  )
}
