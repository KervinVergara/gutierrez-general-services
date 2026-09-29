import { useEffect, useRef, useState } from 'react'
import { PHONE_DISPLAY } from '../../content'
import Icon from '../Icon'
import { Field, inputCls } from './shared'
import logoNavy from '../../assets/photos/logo-new.webp'

const WEBSITE = 'gutierrezgeneralservices.com'
const LOCATION_SHORT = 'WARSAW, IN'
const LOCATION_FULL = 'Warsaw, Indiana'
const NAVY = '#123b55'
const GOLD = '#f3c64e'
const SAND = '#f7f5ef'
const STEEL = '#52616b'

// Fixed on purpose — the whole point is "always the same format", not a picker. Matches
// the reel format already in use on Drive (GGS/01_Contenido_final): a persistent sand
// header/footer frame around the photo, not a separate navy intro/outro screen.
const FORMAT = { w: 1080, h: 1920 }
const TOP_FRAC = 0.22
const PHOTO_END_FRAC = 0.85
const TRANSITION_DUR = 0.5
const FPS = 30
const MAX_VIDEO_CLIP = 10 // seconds, safety cap on a single trimmed clip

const STYLES = [
  { id: 'fade', label: 'Fade' },
  { id: 'zoom', label: 'Zoom' },
  { id: 'slide', label: 'Slide' },
]

const BADGE_LABEL = { es: 'FOTOS REALES GGS', en: 'REAL GGS PHOTOS' }

let logoImgPromise = null
function loadLogo() {
  if (!logoImgPromise) {
    logoImgPromise = new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = logoNavy
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
  const base = { id, name, headline: '', caption: '' }
  if (file.type.startsWith('video/')) {
    return loadVideoFile(file).then((v) => ({ ...base, kind: 'video', ...v }))
  }
  return loadImageFile(file).then((img) => ({ ...base, kind: 'photo', img }))
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

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// Cover-fit a photo or a live video frame into an arbitrary rect, with an optional
// zoom-in over time (Ken Burns), centered.
function drawCoverZoomRect(ctx, source, frame, zoomT) {
  const { w: iw, h: ih } = naturalSize(source)
  if (!iw || !ih) return
  const { x, y, w, h } = frame
  const ir = iw / ih
  const r = w / h
  let sw, sh
  if (ir > r) { sh = ih; sw = sh * r } else { sw = iw; sh = sw / r }
  const zoom = 1 + 0.08 * Math.max(0, Math.min(zoomT, 1))
  sw /= zoom
  sh /= zoom
  const sx = (iw - sw) / 2
  const sy = (ih - sh) / 2
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.drawImage(source, sx, sy, sw, sh, x, y, w, h)
  ctx.restore()
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

// The persistent frame: sand header (logo, location, category, per-clip headline) and sand
// footer (per-clip caption, contact info on the last clip only, website, gold divider),
// with the photo/video filling the band between them. This whole thing is what changes
// per clip and what the fade/zoom/slide transition below composites between.
function drawReelFrame(ctx, w, h, clip, localT, dur, logoImg, lang, zoomOn, category, isLast) {
  const topH = h * TOP_FRAC
  const photoH = h * (PHOTO_END_FRAC - TOP_FRAC)
  const photoY = topH
  const bottomY = topH + photoH
  const bottomH = h - bottomY
  const pad = w * 0.055

  ctx.fillStyle = SAND
  ctx.fillRect(0, 0, w, topH)
  ctx.fillRect(0, bottomY, w, bottomH)

  const frame = { x: 0, y: photoY, w, h: photoH }
  if (clip.kind === 'video' && clip.videoEl && clip.videoEl.readyState >= 2) drawCoverZoomRect(ctx, clip.videoEl, frame, 0)
  else if (clip.kind === 'photo' && clip.img) drawCoverZoomRect(ctx, clip.img, frame, zoomOn ? localT / dur : 0)
  else { ctx.fillStyle = '#dfeef5'; ctx.fillRect(frame.x, frame.y, frame.w, frame.h) }

  // Header
  if (logoImg) {
    const lh = topH * 0.32
    const lw = lh * (logoImg.width / logoImg.height)
    ctx.drawImage(logoImg, pad, topH * 0.14, lw, lh)
  }
  ctx.textAlign = 'right'
  ctx.font = `700 ${Math.round(w * 0.023)}px Manrope, sans-serif`
  ctx.fillStyle = STEEL
  ctx.fillText(LOCATION_SHORT, w - pad, topH * 0.26)

  ctx.textAlign = 'left'
  if (category) {
    ctx.font = `800 ${Math.round(w * 0.02)}px Manrope, sans-serif`
    ctx.fillStyle = STEEL
    ctx.fillText(category.toUpperCase(), pad, topH * 0.58)
  }
  if (clip.headline) {
    const { size, lines } = fitWrappedText(ctx, clip.headline, 800, w * 0.05, w * 0.03, w - pad * 2, 2)
    ctx.font = `800 ${Math.round(size)}px Manrope, sans-serif`
    ctx.fillStyle = NAVY
    const startY = topH * 0.78 - (lines.length - 1) * size * 1.12
    lines.forEach((l, i) => ctx.fillText(l, pad, startY + i * size * 1.12))
  }

  // Badge on the photo
  const badgeLabel = BADGE_LABEL[lang] || BADGE_LABEL.en
  ctx.font = `800 ${Math.round(w * 0.019)}px Manrope, sans-serif`
  const badgeTextW = ctx.measureText(badgeLabel).width
  const badgePadX = w * 0.022
  const badgeH = w * 0.044
  const badgeW = badgeTextW + badgePadX * 2
  const badgeX = pad
  const badgeY = photoY + w * 0.025
  roundRectPath(ctx, badgeX, badgeY, badgeW, badgeH, badgeH / 2)
  ctx.fillStyle = NAVY
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'left'
  ctx.fillText(badgeLabel, badgeX + badgePadX, badgeY + badgeH * 0.66)

  // Footer
  let by = bottomY + bottomH * 0.3
  ctx.textAlign = 'left'
  if (clip.caption) {
    const { size, lines } = fitWrappedText(ctx, clip.caption, 600, w * 0.026, w * 0.016, w - pad * 2, 2)
    ctx.font = `600 ${Math.round(size)}px Manrope, sans-serif`
    ctx.fillStyle = STEEL
    lines.forEach((l, i) => ctx.fillText(l, pad, by + i * size * 1.3))
    by += lines.length * size * 1.3 + w * 0.012
  }
  if (isLast) {
    ctx.font = `800 ${Math.round(w * 0.026)}px Manrope, sans-serif`
    ctx.fillStyle = NAVY
    ctx.fillText(`${LOCATION_FULL} · ${PHONE_DISPLAY}`, pad, by)
    by += w * 0.042
  }
  ctx.font = `800 ${Math.round(w * 0.026)}px Manrope, sans-serif`
  ctx.fillStyle = NAVY
  ctx.fillText(WEBSITE, pad, by)

  ctx.fillStyle = GOLD
  ctx.fillRect(pad, h - h * 0.012, w - pad * 2, Math.max(2, h * 0.0025))
}

function buildSlides(clips, photoDuration) {
  return clips.map((c, i) => ({
    dur: c.kind === 'video' ? Math.max(0.2, c.trimEnd - c.trimStart) : photoDuration,
    clip: c,
    isLast: i === clips.length - 1,
  }))
}

function renderFrame(ctx, slides, time, w, h, logoImg, lang, style, category) {
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
    const next = slides[idx + 1]
    if (style === 'slide') {
      ctx.save(); ctx.translate(-w * f, 0); drawReelFrame(ctx, w, h, slide.clip, localT, slide.dur, logoImg, lang, false, category, slide.isLast); ctx.restore()
      ctx.save(); ctx.translate(w * (1 - f), 0); drawReelFrame(ctx, w, h, next.clip, 0, next.dur, logoImg, lang, false, category, next.isLast); ctx.restore()
    } else {
      drawReelFrame(ctx, w, h, slide.clip, localT, slide.dur, logoImg, lang, zoomOn, category, slide.isLast)
      ctx.save()
      ctx.globalAlpha = f
      drawReelFrame(ctx, w, h, next.clip, 0, next.dur, logoImg, lang, zoomOn, category, next.isLast)
      ctx.restore()
    }
  } else {
    drawReelFrame(ctx, w, h, slide.clip, localT, slide.dur, logoImg, lang, zoomOn, category, slide.isLast)
  }
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
  const [lang, setLang] = useState('es')
  const [category, setCategory] = useState('EXTERIOR DETAILS')
  const [logoImg, setLogoImg] = useState(null)
  const [scrub, setScrub] = useState(0)

  const [isRendering, setIsRendering] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null) // { url, ext }

  useEffect(() => { loadLogo().then(setLogoImg) }, [])

  const slides = buildSlides(clips, duration)
  const totalDuration = slides.reduce((sum, s) => sum + s.dur, 0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || isRendering) return
    canvas.width = FORMAT.w
    canvas.height = FORMAT.h
    const ctx = canvas.getContext('2d')
    const t = Math.min(scrub, Math.max(totalDuration - 0.001, 0))
    if (slides.length === 0) { ctx.fillStyle = '#dfeef5'; ctx.fillRect(0, 0, FORMAT.w, FORMAT.h); return }
    renderFrame(ctx, slides, t, FORMAT.w, FORMAT.h, logoImg, lang, style, category)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clips, duration, style, lang, category, logoImg, scrub, isRendering, totalDuration, slides])

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
  function updateClipField(id, field, value) {
    setClips((cs) => cs.map((c) => (c.id === id ? { ...c, [field]: value } : c)))
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
        renderFrame(ctx, slides, Math.min(elapsed, totalDuration), FORMAT.w, FORMAT.h, logoImg, lang, style, category)
        let acc = 0
        let activeClip = null
        for (const s of slides) { if (elapsed < acc + s.dur) { activeClip = s.clip; break } acc += s.dur }
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
                  <div className="grid grid-cols-2 gap-1.5">
                    <input placeholder="Título" value={c.headline} onChange={(e) => updateClipField(c.id, 'headline', e.target.value)} className="h-7 rounded border border-ink/15 px-1.5 text-[11px] min-w-0" />
                    <input placeholder="Descripción" value={c.caption} onChange={(e) => updateClipField(c.id, 'caption', e.target.value)} className="h-7 rounded border border-ink/15 px-1.5 text-[11px] min-w-0" />
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
              <p className="text-[11px] text-ink/40">Título y descripción son opcionales por foto/video. Los videos van sin audio propio — el audio y los subtítulos los agregas después en ChatGPT.</p>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white border border-ink/10 p-4 grid gap-3.5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-ink/70">Formato del reel</p>
          <Field label="Categoría (fija todo el reel)">
            <input className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} />
          </Field>
          <Field label={`Duración por foto — ${duration.toFixed(1)}s (no aplica a videos)`}>
            <input type="range" min="1.5" max="5" step="0.1" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full accent-[var(--color-gold)]" />
          </Field>
          <Field label="Estilo de transición">
            <OptionRow options={STYLES.map((s) => s.id)} value={style} onChange={setStyle} labels={Object.fromEntries(STYLES.map((s) => [s.id, s.label]))} />
          </Field>
          <Field label="Idioma del badge sobre la foto">
            <OptionRow options={['es', 'en']} value={lang} onChange={setLang} labels={{ es: 'Español', en: 'English' }} />
          </Field>
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
