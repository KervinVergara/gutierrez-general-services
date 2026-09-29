import { useEffect, useRef, useState } from 'react'
import { PHONE_DISPLAY } from '../../content'
import Icon from '../Icon'
import { Field, inputCls } from './shared'
import logoNavy from '../../assets/photos/logo-new.webp'

const WEBSITE = 'gutierrezgeneralservices.com'
const LOCATION_FULL = 'Warsaw, Indiana'
const NAVY = '#123b55'
const GOLD = '#f3c64e'
const SAND = '#f7f5ef'
const STEEL = '#52616b'

// Fixed on purpose — the whole point is "always the same format", not a picker.
const FORMAT = { w: 1080, h: 1920 }
const INTRO_EXTRA = 2 // the first clip holds this many extra seconds, acting as the intro
const OUTRO_DUR = 2
const TRANSITION_DUR = 0.5
const FPS = 30
const MAX_VIDEO_CLIP = 10 // seconds, safety cap on a single trimmed clip

// Shared with the outro card so its logo and "Warsaw, Indiana" line land in the exact
// same spot as every body slide — "para que todo se vea igual".
const TOP_BAND_FRAC = 0.24
const BOTTOM_BAND_FRAC = 0.13

const STYLES = [
  { id: 'fade', label: 'Fade' },
  { id: 'zoom', label: 'Zoom' },
  { id: 'slide', label: 'Slide' },
]

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
  if (file.type.startsWith('video/')) {
    return loadVideoFile(file).then((v) => ({ id, name, kind: 'video', ...v }))
  }
  return loadImageFile(file).then((img) => ({ id, name, kind: 'photo', img }))
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
// zoom-in over time (Ken Burns), centered, clipped to the rect.
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

// Phone + website stacked above "Warsaw, Indiana" — the location line lands at the exact
// same y as every body slide's, with the same font/color, so the outro's footer reads as
// a taller version of the same footer rather than a different design.
function drawOutroFooter(ctx, w, h) {
  const bottomBandH = h * BOTTOM_BAND_FRAC
  const locationY = h - bottomBandH * 0.32
  const websiteY = locationY - w * 0.048
  const phoneY = websiteY - w * 0.048
  ctx.textAlign = 'center'
  ctx.font = `700 ${Math.round(w * 0.026)}px Manrope, sans-serif`
  ctx.fillStyle = STEEL
  ctx.fillText(PHONE_DISPLAY, w / 2, phoneY)
  ctx.font = `800 ${Math.round(w * 0.028)}px Manrope, sans-serif`
  ctx.fillStyle = NAVY
  ctx.fillText(WEBSITE, w / 2, websiteY)
  ctx.font = `700 ${Math.round(w * 0.026)}px Manrope, sans-serif`
  ctx.fillStyle = STEEL
  ctx.fillText(LOCATION_FULL, w / 2, locationY)
}

// Outro card: sand background, logo top-center at the exact same size/position as a body
// slide's, a reserved center area for text — left BLANK by default (empty string) so the
// space stays clean for a CTA added afterward in ChatGPT — and phone/website/location at
// the bottom, matching the body slides' footer position.
function drawTitleCard(ctx, w, h, localT, logoImg, text) {
  ctx.fillStyle = SAND
  ctx.fillRect(0, 0, w, h)
  const topBandH = h * TOP_BAND_FRAC
  const fadeIn = Math.min(localT / 0.35, 1)
  ctx.save()
  ctx.globalAlpha = fadeIn
  if (logoImg) {
    const lh = topBandH * 0.3
    const lw = lh * (logoImg.width / logoImg.height)
    ctx.drawImage(logoImg, (w - lw) / 2, topBandH * 0.12, lw, lh)
  }
  if (text) {
    const pad = w * 0.1
    ctx.textAlign = 'center'
    const { size, lines } = fitWrappedText(ctx, text, 800, w * 0.06, w * 0.032, w - pad * 2, 4)
    ctx.fillStyle = NAVY
    const lineH = size * 1.16
    const startY = h / 2 - ((lines.length - 1) * lineH) / 2
    ctx.font = `800 ${Math.round(size)}px Manrope, sans-serif`
    lines.forEach((l, i) => ctx.fillText(l, w / 2, startY + i * lineH))
  }
  drawOutroFooter(ctx, w, h)
  ctx.restore()
  ctx.fillStyle = GOLD
  ctx.fillRect(w * 0.08, h - h * 0.012, w * 0.84, Math.max(2, h * 0.0025))
}

// Every clip slide (the first one doubles as the intro — see buildSlides): same sand
// background throughout, logo on top, reserved blank gaps for a title and a subtitle (left
// for ChatGPT to fill in afterward), the photo/video delimited only by rounded corners (no
// border/frame), and the city at the bottom.
function drawBodySlide(ctx, w, h, clip, localT, dur, zoomOn, logoImg) {
  ctx.fillStyle = SAND
  ctx.fillRect(0, 0, w, h)

  const topBandH = h * TOP_BAND_FRAC
  const bottomBandH = h * BOTTOM_BAND_FRAC
  const pad = w * 0.06
  const cardX = pad
  const cardY = topBandH
  const cardW = w - pad * 2
  const cardH = h - topBandH - bottomBandH
  const radius = w * 0.035

  if (logoImg) {
    const lh = topBandH * 0.3
    const lw = lh * (logoImg.width / logoImg.height)
    ctx.drawImage(logoImg, (w - lw) / 2, topBandH * 0.12, lw, lh)
  }
  // Blank on purpose: the rest of topBandH (below the logo) reserves room for a title, and
  // the gap in bottomBandH between the photo and the city line reserves room for a
  // subtitle — both added later in ChatGPT, not drawn here. Subtitle lives below the photo
  // (flat sand background) rather than over it, so it never needs a scrim to stay legible.

  ctx.save()
  roundRectPath(ctx, cardX, cardY, cardW, cardH, radius)
  ctx.clip()
  if (clip.kind === 'video' && clip.videoEl && clip.videoEl.readyState >= 2) drawCoverZoomRect(ctx, clip.videoEl, { x: cardX, y: cardY, w: cardW, h: cardH }, 0)
  else if (clip.kind === 'photo' && clip.img) drawCoverZoomRect(ctx, clip.img, { x: cardX, y: cardY, w: cardW, h: cardH }, zoomOn ? localT / dur : 0)
  else { ctx.fillStyle = '#dfeef5'; ctx.fillRect(cardX, cardY, cardW, cardH) }
  ctx.restore()

  ctx.textAlign = 'center'
  ctx.font = `700 ${Math.round(w * 0.026)}px Manrope, sans-serif`
  ctx.fillStyle = STEEL
  ctx.fillText(LOCATION_FULL, w / 2, h - bottomBandH * 0.32)

  ctx.fillStyle = GOLD
  ctx.fillRect(w * 0.08, h - h * 0.012, w * 0.84, Math.max(2, h * 0.0025))
}

function drawSlide(ctx, slide, localT, w, h, logoImg, zoomOn, outroText) {
  if (slide.kind === 'outro') return drawTitleCard(ctx, w, h, localT, logoImg, outroText)
  return drawBodySlide(ctx, w, h, slide.clip, localT, slide.dur, zoomOn, logoImg)
}

// The first clip stays on screen INTRO_EXTRA seconds longer than a normal slide — that's
// the "intro": the first photo/video itself, held a bit longer, not a separate blank card.
function buildSlides(clips, photoDuration) {
  const slides = []
  clips.forEach((c, i) => {
    const baseDur = c.kind === 'video' ? Math.max(0.2, c.trimEnd - c.trimStart) : photoDuration
    const dur = i === 0 ? baseDur + INTRO_EXTRA : baseDur
    slides.push({ kind: 'clip', dur, clip: c })
  })
  slides.push({ kind: 'outro', dur: OUTRO_DUR })
  return slides
}

function renderFrame(ctx, slides, time, w, h, logoImg, style, outroText) {
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
      ctx.save(); ctx.translate(-w * f, 0); drawSlide(ctx, slide, localT, w, h, logoImg, false, outroText); ctx.restore()
      ctx.save(); ctx.translate(w * (1 - f), 0); drawSlide(ctx, next, 0, w, h, logoImg, false, outroText); ctx.restore()
    } else {
      drawSlide(ctx, slide, localT, w, h, logoImg, zoomOn, outroText)
      ctx.save()
      ctx.globalAlpha = f
      drawSlide(ctx, next, 0, w, h, logoImg, zoomOn, outroText)
      ctx.restore()
    }
  } else {
    drawSlide(ctx, slide, localT, w, h, logoImg, zoomOn, outroText)
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
  const [outroText, setOutroText] = useState('')
  const [logoImg, setLogoImg] = useState(null)
  const [scrub, setScrub] = useState(0.5)
  const [music, setMusic] = useState(null) // { name, url }
  const [musicVolume, setMusicVolume] = useState(0.6)

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
    renderFrame(ctx, slides, t, FORMAT.w, FORMAT.h, logoImg, style, outroText)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clips, duration, style, outroText, logoImg, scrub, isRendering, totalDuration, slides])

  async function onUpload(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const loaded = await Promise.all(files.map(loadClip))
    setClips((cs) => [...cs, ...loaded])
    e.target.value = ''
  }
  function removeClip(id) { setClips((cs) => cs.filter((c) => c.id !== id)) }
  function onUploadMusic(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (music) URL.revokeObjectURL(music.url)
    setMusic({ name: file.name, url: URL.createObjectURL(file) })
    e.target.value = ''
  }
  function removeMusic() {
    if (music) URL.revokeObjectURL(music.url)
    setMusic(null)
  }
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

    // Background music: routed through Web Audio (not the <audio> tag's own output) so it
    // reaches the recorded MediaStream but never plays out loud during the real-time render.
    let audioCtx = null
    let audioEl = null
    if (music) {
      audioEl = document.createElement('audio')
      audioEl.src = music.url
      audioEl.loop = true
      audioEl.crossOrigin = 'anonymous'
      document.body.appendChild(audioEl)
      audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const source = audioCtx.createMediaElementSource(audioEl)
      const gain = audioCtx.createGain()
      gain.gain.value = musicVolume
      const dest = audioCtx.createMediaStreamDestination()
      source.connect(gain)
      gain.connect(dest)
      audioCtx._dest = dest
      try { await audioEl.play() } catch { /* autoplay blocked — reel will render without sound */ }
    }

    const mimeType = pickMimeType()
    const videoStream = canvas.captureStream(FPS)
    const tracks = [...videoStream.getVideoTracks()]
    if (audioCtx) tracks.push(...audioCtx._dest.stream.getAudioTracks())
    const stream = new MediaStream(tracks)
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
        renderFrame(ctx, slides, Math.min(elapsed, totalDuration), FORMAT.w, FORMAT.h, logoImg, style, outroText)
        let acc = 0
        let activeClip = null
        for (const s of slides) { if (elapsed < acc + s.dur) { activeClip = s.kind === 'clip' ? s.clip : null; break } acc += s.dur }
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
    if (audioEl) { audioEl.pause(); audioEl.remove() }
    if (audioCtx) audioCtx.close()
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
              <p className="text-[11px] text-ink/40">Sin título ni descripción por foto — eso lo deja el formato limpio para que ChatGPT agregue subtítulos y narración después. Los videos van sin audio propio.</p>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white border border-ink/10 p-4 grid gap-3.5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-ink/70">Outro</p>
          <Field label="CTA del outro (opcional — vacío = espacio libre para ChatGPT)">
            <input className={inputCls} placeholder="Déjalo vacío si ChatGPT pondrá el CTA" value={outroText} onChange={(e) => setOutroText(e.target.value)} />
          </Field>
          <p className="text-[11px] text-ink/40">El intro ya no es una tarjeta aparte: la primera foto o video se queda en pantalla un poco más y hace de intro.</p>
        </div>

        <div className="rounded-2xl bg-white border border-ink/10 p-4 grid gap-3.5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-ink/70">Música de fondo (opcional)</p>
          {!music ? (
            <label className="flex items-center justify-center gap-2 h-11 px-3 rounded-lg border border-ink/20 cursor-pointer text-sm font-semibold text-ink/70 hover:border-ink">
              <Icon name="image" size={16} /> Subir MP3 propio…
              <input type="file" accept="audio/*" className="hidden" onChange={onUploadMusic} />
            </label>
          ) : (
            <div className="grid gap-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex-1 min-w-0 text-xs text-ink/70 truncate" title={music.name}>{music.name}</span>
                <button type="button" onClick={removeMusic} aria-label="Quitar música" className="grid place-items-center w-8 h-8 rounded-md border border-ink/15 hover:border-red-600 hover:text-red-600 shrink-0"><Icon name="trash" size={13} /></button>
              </div>
              <audio src={music.url} controls className="w-full h-9" />
              <Field label={`Volumen — ${Math.round(musicVolume * 100)}%`}>
                <input type="range" min="0" max="1" step="0.05" value={musicVolume} onChange={(e) => setMusicVolume(Number(e.target.value))} className="w-full accent-[var(--color-gold)]" />
              </Field>
            </div>
          )}
          <p className="text-[11px] text-ink/40">Se repite en bucle si el video dura más que la canción. Asegúrate de que el MP3 sea libre de derechos — eso no lo verifica la herramienta.</p>
        </div>

        <div className="rounded-2xl bg-white border border-ink/10 p-4 grid gap-3.5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-ink/70">Formato del reel</p>
          <Field label={`Duración por foto — ${duration.toFixed(1)}s (la primera se queda ${(duration + INTRO_EXTRA).toFixed(1)}s como intro · no aplica a videos)`}>
            <input type="range" min="1.5" max="5" step="0.1" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full accent-[var(--color-gold)]" />
          </Field>
          <Field label="Estilo de transición">
            <OptionRow options={STYLES.map((s) => s.id)} value={style} onChange={setStyle} labels={Object.fromEntries(STYLES.map((s) => [s.id, s.label]))} />
          </Field>
          <p className="text-[11px] text-ink/40">1080×1920 vertical, siempre el mismo fondo y formato · duración total: {totalDuration.toFixed(1)}s</p>
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
