import { useEffect, useRef, useState } from 'react'
import { content, BUSINESS, PHONE_DISPLAY } from '../../content'
import Icon from '../Icon'
import { Field, inputCls } from './shared'
import logoSrc from '../../assets/photos/logo-new.png'

const WEBSITE = 'gutierrez-general-services.web.app'
const LOCATION = 'Warsaw, Indiana'

const NAVY = '#123b55'
const NAVY2 = '#1a4d6e'
const GOLD = '#f3c64e'
const SAND = '#f7f5ef'

const FORMATS = [
  { id: 'ig_post', label: 'Instagram / Facebook Post', w: 1080, h: 1080 },
  { id: 'ig_story', label: 'Instagram / TikTok Story', w: 1080, h: 1920 },
  { id: 'fb_horizontal', label: 'Facebook Horizontal', w: 1200, h: 630 },
  { id: 'wa_status', label: 'WhatsApp Status', w: 1080, h: 1920 },
]

const TEMPLATES = [
  { id: 'photo_hero', label: 'Photo Hero' },
  { id: 'split', label: 'Split Layout' },
  { id: 'clean_brand', label: 'Clean Brand' },
]

// Editor control labels — always Spanish, regardless of "Idioma de la pieza" (that only
// affects the ad copy that gets drawn on the canvas, not the panel controls around it).
const AD_TYPES = [
  { id: 'service', label: 'Servicio' },
  { id: 'promo', label: 'Promoción' },
  { id: 'before_after', label: 'Antes / Después' },
  { id: 'general', label: 'General' },
]

const CTA_TYPES = ['call', 'quote', 'message', 'book', 'custom']
const CTA_BUTTON_LABEL = { call: 'Call Now', quote: 'Get a Quote', message: 'Message Us', book: 'Book Now', custom: 'Custom' }
const CTA_PRESETS = {
  es: { call: 'Llamar ahora', quote: 'Cotización gratis', message: 'Escríbenos', book: 'Reservar ahora' },
  en: { call: 'Call Now', quote: 'Get a Free Quote', message: 'Message Us', book: 'Book Now' },
}

const TITLE_SIZE = { small: 0.045, medium: 0.065, large: 0.085 }
const SUB_SIZE = { small: 0.024, medium: 0.03, large: 0.036 }
const LOGO_W = { small: 0.14, medium: 0.2, large: 0.28 }
// Hand-measured bounding box of the house/car mark within logo-new.png, before the gap that starts the "GUTIERREZ" wordmark.
const LOGO_ICON_CROP = { w: 606, h: 398 }
const LOGO_FULL_SIZE = { w: 1720, h: 398 }

const PRESET_KEY = 'ggs_ad_presets'
function loadPresets() { try { return JSON.parse(localStorage.getItem(PRESET_KEY) || '[]') } catch { return [] } }
function savePresetsList(list) { try { localStorage.setItem(PRESET_KEY, JSON.stringify(list)) } catch { /* storage unavailable */ } }

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

function emptyPhoto() { return { img: null, fit: 'cover', pos: 'center', dragX: 0, dragY: 0 } }

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
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

function fitWrappedText(ctx, text, weight, baseSize, minSize, maxWidth, maxLines) {
  let size = baseSize
  let lines = []
  for (let tries = 0; tries < 60; tries++) {
    ctx.font = `${weight} ${Math.round(size)}px Manrope, sans-serif`
    lines = wrapLines(ctx, text, maxWidth, maxLines)
    const widest = lines.reduce((m, l) => Math.max(m, ctx.measureText(l).width), 0)
    if (widest <= maxWidth || size <= minSize) break
    size -= 1
  }
  return { size, lines }
}

function drawCover(ctx, img, frame, photo) {
  const { x, y, w, h } = frame
  const ir = img.width / img.height
  const r = w / h
  let sw, sh
  if (ir > r) { sh = img.height; sw = sh * r } else { sw = img.width; sh = sw / r }
  let sx = (img.width - sw) / 2
  let sy = (img.height - sh) / 2
  const pos = photo.pos || 'center'
  if (pos === 'left') sx = 0
  else if (pos === 'right') sx = img.width - sw
  else if (pos === 'top') sy = 0
  else if (pos === 'bottom') sy = img.height - sh
  const maxDx = img.width - sw
  const maxDy = img.height - sh
  sx = Math.min(Math.max(sx - (photo.dragX || 0), 0), Math.max(maxDx, 0))
  sy = Math.min(Math.max(sy - (photo.dragY || 0), 0), Math.max(maxDy, 0))
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

function drawContain(ctx, img, frame) {
  const { x, y, w, h } = frame
  const ir = img.width / img.height
  const r = w / h
  let dw, dh
  if (ir > r) { dw = w; dh = dw / ir } else { dh = h; dw = dh * ir }
  const dx = x + (w - dw) / 2
  const dy = y + (h - dh) / 2
  ctx.drawImage(img, dx, dy, dw, dh)
}

function drawPhotoPlaceholder(ctx, frame) {
  const { x, y, w, h } = frame
  const grad = ctx.createLinearGradient(x, y, x + w, y + h)
  grad.addColorStop(0, NAVY2)
  grad.addColorStop(1, NAVY)
  ctx.fillStyle = grad
  ctx.fillRect(x, y, w, h)
}

function drawPhotoInFrame(ctx, photo, frame, radius) {
  ctx.save()
  if (radius) { roundRect(ctx, frame.x, frame.y, frame.w, frame.h, radius); ctx.clip() }
  if (photo.fit === 'contain') drawContain(ctx, photo.img, frame)
  else drawCover(ctx, photo.img, frame, photo)
  ctx.restore()
}

function drawPhotoOrPlaceholder(ctx, photo, frame, radius) {
  if (photo?.img) drawPhotoInFrame(ctx, photo, frame, radius)
  else drawPhotoPlaceholder(ctx, frame)
}

function drawLogo(ctx, logoImg, format, pos, sizeKey, variant) {
  if (!logoImg) return
  const { w, h } = format
  const useIcon = variant === 'icon'
  const targetH = w * LOGO_W[sizeKey] * (LOGO_FULL_SIZE.h / LOGO_FULL_SIZE.w)
  const lh = targetH
  const lw = useIcon ? targetH * (LOGO_ICON_CROP.w / LOGO_ICON_CROP.h) : targetH * (LOGO_FULL_SIZE.w / LOGO_FULL_SIZE.h)
  const margin = Math.min(w, h) * 0.045
  let x, y
  if (pos.includes('left')) x = margin
  else if (pos.includes('right')) x = w - margin - lw
  else x = (w - lw) / 2
  if (pos.startsWith('top')) y = margin
  else y = h - margin - lh
  if (useIcon) ctx.drawImage(logoImg, 0, 0, LOGO_ICON_CROP.w, LOGO_ICON_CROP.h, x, y, lw, lh)
  else ctx.drawImage(logoImg, x, y, lw, lh)
}

function bottomSafePad(format) {
  const tall = format.h > format.w * 1.3
  return tall ? format.h * 0.13 : Math.min(format.w, format.h) * 0.08
}

function ctaLabel(state) {
  const base = state.ctaType === 'custom' ? (state.ctaCustom || '') : CTA_PRESETS[state.pieceLang][state.ctaType]
  const bits = []
  if (state.showPhone) bits.push(PHONE_DISPLAY)
  if (state.showWebsite) bits.push(WEBSITE)
  if (state.showLocation) bits.push(LOCATION)
  const info = bits.join(' · ')
  return info ? `${base} · ${info}` : base
}

function buildTexts(state) {
  if (state.adType === 'promo') return { title: state.title || '', subtitle: state.description || '' }
  if (state.adType === 'before_after') return { title: state.title || '', subtitle: '' }
  return { title: state.title || '', subtitle: state.subtitle || '' }
}

function priceRowTotalWidth(ctx, state, w) {
  let total = 0
  if (state.showOldPrice && state.oldPrice) {
    ctx.font = `600 ${Math.round(w * 0.028)}px Manrope, sans-serif`
    total += ctx.measureText(state.oldPrice).width + w * 0.025
  }
  ctx.font = `800 ${Math.round(w * 0.045)}px Manrope, sans-serif`
  total += ctx.measureText(state.price).width
  return total
}

function drawPriceRow(ctx, x0, y, state, w, mode) {
  let cx = x0
  ctx.textAlign = 'left'
  if (state.showOldPrice && state.oldPrice) {
    ctx.font = `600 ${Math.round(w * 0.028)}px Manrope, sans-serif`
    ctx.fillStyle = mode === 'light' ? 'rgba(255,255,255,0.55)' : 'rgba(18,59,85,0.45)'
    const oldW = ctx.measureText(state.oldPrice).width
    ctx.fillText(state.oldPrice, cx, y)
    ctx.strokeStyle = ctx.fillStyle
    ctx.lineWidth = Math.max(1, w * 0.0015)
    ctx.beginPath(); ctx.moveTo(cx, y - w * 0.014); ctx.lineTo(cx + oldW, y - w * 0.014); ctx.stroke()
    cx += oldW + w * 0.025
  }
  ctx.font = `800 ${Math.round(w * 0.045)}px Manrope, sans-serif`
  ctx.fillStyle = mode === 'light' ? GOLD : NAVY
  ctx.fillText(state.price, cx, y)
}

function fitFont(ctx, text, weight, baseSize, minSize, maxWidth) {
  let size = baseSize
  ctx.font = `${weight} ${Math.round(size)}px Manrope, sans-serif`
  let tw = ctx.measureText(text).width
  while (tw > maxWidth && size > minSize) {
    size -= 1
    ctx.font = `${weight} ${Math.round(size)}px Manrope, sans-serif`
    tw = ctx.measureText(text).width
  }
  return { size, width: tw }
}

function drawCtaChip(ctx, alignX, y, textAlign, cta, w, maxWidth) {
  if (!cta) return y
  const padX = w * 0.03
  const { size, width: textW } = fitFont(ctx, cta, 800, w * 0.028, w * 0.014, (maxWidth ?? w * 0.86) - padX * 2)
  const ctaW = textW + padX * 2
  const chipH = size * 1.85
  let chipX = textAlign === 'center' ? alignX - ctaW / 2 : textAlign === 'right' ? alignX - ctaW : alignX
  chipX = Math.min(Math.max(chipX, w * 0.02), w - ctaW - w * 0.02)
  roundRect(ctx, chipX, y - chipH, ctaW, chipH, chipH / 2)
  ctx.fillStyle = GOLD
  ctx.fill()
  ctx.fillStyle = NAVY
  ctx.textAlign = 'left'
  ctx.font = `800 ${Math.round(size)}px Manrope, sans-serif`
  ctx.fillText(cta, chipX + padX, y - chipH * 0.32)
  ctx.textAlign = textAlign
  return y - chipH - w * 0.03
}

function drawContentBlock(ctx, state, padBottom, mode) {
  const { format, textAlign, titleSize } = state
  const { w, h } = format
  const pad = Math.min(w, h) * 0.07
  const alignX = textAlign === 'center' ? w / 2 : textAlign === 'right' ? w - pad : pad
  ctx.textAlign = textAlign
  const texts = buildTexts(state)
  let y = h - padBottom

  y = drawCtaChip(ctx, alignX, y, textAlign, ctaLabel(state), w, w - pad * 2)

  if (state.adType === 'promo' && state.price) {
    const total = priceRowTotalWidth(ctx, state, w)
    const x0 = textAlign === 'center' ? alignX - total / 2 : textAlign === 'right' ? alignX - total : alignX
    drawPriceRow(ctx, x0, y, state, w, mode)
    ctx.textAlign = textAlign
    y -= w * 0.045 * 1.4
    if (state.showValidity && state.validity) {
      ctx.font = `600 ${Math.round(w * 0.022)}px Manrope, sans-serif`
      ctx.fillStyle = mode === 'light' ? 'rgba(255,255,255,0.7)' : 'rgba(18,59,85,0.6)'
      ctx.fillText(state.validity, alignX, y)
      y -= w * 0.022 * 1.5
    }
    y -= w * 0.01
  }

  const maxTextW = w - pad * 2
  if (texts.subtitle) {
    const { size: subSize, lines: subLines } = fitWrappedText(ctx, texts.subtitle, 600, w * SUB_SIZE[titleSize], w * 0.014, maxTextW, 3)
    ctx.fillStyle = mode === 'light' ? 'rgba(255,255,255,0.88)' : 'rgba(18,59,85,0.75)'
    for (let i = subLines.length - 1; i >= 0; i--) { ctx.fillText(subLines[i], alignX, y); y -= subSize * 1.35 }
    y -= w * 0.015
  }

  const { size: titleFontSize, lines: titleLines } = fitWrappedText(ctx, texts.title, 800, w * TITLE_SIZE[titleSize], w * 0.03, maxTextW, 3)
  ctx.fillStyle = mode === 'light' ? '#fff' : NAVY
  for (let i = titleLines.length - 1; i >= 0; i--) { ctx.fillText(titleLines[i], alignX, y); y -= titleFontSize * 1.15 }
}

function drawInfoPanelText(ctx, frame, state, mode) {
  const { textAlign, titleSize, format } = state
  const w = format.w
  const pad = frame.w * 0.12
  const alignX = textAlign === 'center' ? frame.x + frame.w / 2 : textAlign === 'right' ? frame.x + frame.w - pad : frame.x + pad
  ctx.textAlign = textAlign
  const texts = buildTexts(state)
  const maxTextW = frame.w - pad * 2

  const titleBase = Math.min(w * TITLE_SIZE[titleSize] * 0.85, frame.w * 0.16)
  const { size: titleFontSize, lines: titleLines } = fitWrappedText(ctx, texts.title, 800, titleBase, w * 0.024, maxTextW, 4)
  ctx.fillStyle = mode === 'light' ? '#fff' : NAVY
  let y = frame.y + frame.h * 0.26
  titleLines.forEach((l) => { ctx.fillText(l, alignX, y); y += titleFontSize * 1.2 })

  if (texts.subtitle) {
    y += w * 0.012
    const subBase = Math.min(w * SUB_SIZE[titleSize], frame.w * 0.075)
    const { size: subFontSize, lines: subLines } = fitWrappedText(ctx, texts.subtitle, 600, subBase, w * 0.013, maxTextW, 3)
    ctx.fillStyle = mode === 'light' ? 'rgba(255,255,255,0.85)' : 'rgba(18,59,85,0.75)'
    subLines.forEach((l) => { ctx.fillText(l, alignX, y); y += subFontSize * 1.35 })
  }

  if (state.adType === 'promo' && state.price) {
    y += w * 0.02
    const total = priceRowTotalWidth(ctx, state, w)
    const x0 = textAlign === 'center' ? alignX - total / 2 : textAlign === 'right' ? alignX - total : alignX
    drawPriceRow(ctx, x0, y, state, w, mode)
    ctx.textAlign = textAlign
    y += w * 0.045 * 1.4
    if (state.showValidity && state.validity) {
      ctx.font = `600 ${Math.round(w * 0.02)}px Manrope, sans-serif`
      ctx.fillStyle = mode === 'light' ? 'rgba(255,255,255,0.7)' : 'rgba(18,59,85,0.6)'
      ctx.fillText(state.validity, alignX, y)
      y += w * 0.02 * 1.4
    }
  }

  const cta = ctaLabel(state)
  if (cta) {
    y += w * 0.02
    const padX = w * 0.025
    const { size, width: textW } = fitFont(ctx, cta, 800, w * 0.026, w * 0.013, maxTextW - padX * 2)
    const ctaW = textW + padX * 2
    const chipH = size * 1.85
    let chipX = textAlign === 'center' ? alignX - ctaW / 2 : textAlign === 'right' ? alignX - ctaW : alignX
    chipX = Math.min(Math.max(chipX, frame.x + pad * 0.3), frame.x + frame.w - ctaW - pad * 0.3)
    roundRect(ctx, chipX, y, ctaW, chipH, chipH / 2)
    ctx.fillStyle = GOLD; ctx.fill()
    ctx.fillStyle = NAVY
    ctx.textAlign = 'left'
    ctx.font = `800 ${Math.round(size)}px Manrope, sans-serif`
    ctx.fillText(cta, chipX + padX, y + chipH * 0.66)
    ctx.textAlign = textAlign
  }
}

function drawLabelPill(ctx, frame, label, w, topReserve) {
  if (!label) return
  const pad = w * 0.02
  ctx.font = `800 ${Math.round(w * 0.024)}px Manrope, sans-serif`
  const textW = ctx.measureText(label).width
  const chipW = textW + w * 0.035
  const chipH = w * 0.042
  const x = frame.x + pad
  const y = frame.y + pad + (topReserve || 0)
  roundRect(ctx, x, y, chipW, chipH, chipH / 2)
  ctx.fillStyle = NAVY
  ctx.fill()
  ctx.fillStyle = GOLD
  ctx.textAlign = 'left'
  ctx.fillText(label, x + w * 0.017, y + chipH * 0.68)
}

function computeFrames(format, templateId, orientation) {
  const { w, h } = format
  if (templateId === 'split') {
    const wide = w > h * 1.3
    return wide
      ? { main: { x: 0, y: 0, w: w * 0.6, h }, info: { x: w * 0.6, y: 0, w: w * 0.4, h } }
      : { main: { x: 0, y: 0, w, h: h * 0.6 }, info: { x: 0, y: h * 0.6, w, h: h * 0.4 } }
  }
  if (templateId === 'clean_brand') {
    const pad = Math.min(w, h) * 0.08
    return { main: { x: pad, y: h * 0.13, w: w - pad * 2, h: h * 0.42 } }
  }
  if (templateId === 'before_after') {
    return orientation === 'horizontal'
      ? { before: { x: 0, y: 0, w, h: h / 2 - 2 }, after: { x: 0, y: h / 2 + 2, w, h: h / 2 - 2 } }
      : { before: { x: 0, y: 0, w: w / 2 - 2, h }, after: { x: w / 2 + 2, y: 0, w: w / 2 - 2, h } }
  }
  return { main: { x: 0, y: 0, w, h } }
}

function renderPhotoHero(ctx, state) {
  const { format, overlay } = state
  const { w, h } = format
  drawPhotoOrPlaceholder(ctx, state.photo, { x: 0, y: 0, w, h })

  const grad = ctx.createLinearGradient(0, h * 0.4, 0, h)
  grad.addColorStop(0, 'rgba(18,59,85,0)')
  grad.addColorStop(1, 'rgba(18,59,85,0.88)')
  ctx.fillStyle = grad
  ctx.fillRect(0, h * 0.4, w, h * 0.6)

  if (overlay > 0) {
    ctx.fillStyle = `rgba(0,0,0,${(overlay / 100).toFixed(2)})`
    ctx.fillRect(0, 0, w, h)
  }

  drawContentBlock(ctx, state, bottomSafePad(format), 'light')
}

function renderSplit(ctx, state) {
  const frames = computeFrames(state.format, 'split', null)
  drawPhotoOrPlaceholder(ctx, state.photo, frames.main)

  const light = state.style === 'light'
  ctx.fillStyle = light ? SAND : NAVY
  ctx.fillRect(frames.info.x, frames.info.y, frames.info.w, frames.info.h)

  drawInfoPanelText(ctx, frames.info, state, light ? 'dark' : 'light')
}

function renderCleanBrand(ctx, state) {
  const { format, style } = state
  const { w, h } = format
  let mode = 'light'
  if (style === 'light') { ctx.fillStyle = SAND; ctx.fillRect(0, 0, w, h); mode = 'dark' }
  else if (style === 'photo') {
    if (state.photo?.img) drawPhotoInFrame(ctx, state.photo, { x: 0, y: 0, w, h })
    else { ctx.fillStyle = NAVY; ctx.fillRect(0, 0, w, h) }
    ctx.fillStyle = 'rgba(18,59,85,0.55)'
    ctx.fillRect(0, 0, w, h)
  } else { ctx.fillStyle = NAVY; ctx.fillRect(0, 0, w, h) }

  const hasPhoto = style !== 'photo' && !!state.photo?.img
  if (hasPhoto) {
    const frames = computeFrames(format, 'clean_brand', null)
    const radius = Math.min(frames.main.w, frames.main.h) * 0.04
    drawPhotoInFrame(ctx, state.photo, frames.main, radius)
  }

  // Without a photo there's no frame to anchor text below, so give the type room to
  // breathe near the middle instead of a bordered placeholder that reads as a missing image.
  const padBottom = hasPhoto ? bottomSafePad(format) : h * 0.36
  drawContentBlock(ctx, state, padBottom, mode)
}

function renderBeforeAfter(ctx, state) {
  const { format, orientation } = state
  const { w, h } = format
  const frames = computeFrames(format, 'before_after', orientation)
  drawPhotoOrPlaceholder(ctx, state.photoBefore, frames.before)
  drawPhotoOrPlaceholder(ctx, state.photoAfter, frames.after)

  ctx.fillStyle = GOLD
  if (orientation === 'horizontal') ctx.fillRect(0, h / 2 - 2, w, 4)
  else ctx.fillRect(w / 2 - 2, 0, 4, h)

  const topReserve = state.logoOn && state.logoPos.startsWith('top') ? h * 0.09 : 0
  drawLabelPill(ctx, frames.before, state.beforeLabel, w, topReserve)
  drawLabelPill(ctx, frames.after, state.afterLabel, w, topReserve)

  const cta = ctaLabel(state)
  const hasTitle = !!state.title
  if (hasTitle || cta) {
    const barH = h * (h > w * 1.3 ? 0.13 : 0.17)
    ctx.fillStyle = NAVY
    ctx.fillRect(0, h - barH, w, barH)
    ctx.textAlign = 'center'
    let y = h - barH * 0.36
    if (cta) {
      fitFont(ctx, cta, 800, w * 0.026, w * 0.013, w * 0.9)
      ctx.fillStyle = GOLD
      ctx.fillText(cta, w / 2, y)
      y -= barH * 0.52
    }
    if (hasTitle) {
      const maxW = w * 0.9
      const { size } = fitFont(ctx, state.title, 800, w * 0.032, w * 0.02, maxW)
      ctx.font = `800 ${Math.round(size)}px Manrope, sans-serif`
      ctx.fillStyle = '#fff'
      ctx.fillText(state.title, w / 2, y)
    }
  }
}

async function render(canvas, state) {
  const { w, h } = state.format
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  try { await document.fonts.load(`800 ${Math.round(w * 0.08)}px Manrope`); await document.fonts.ready } catch { /* fall back to default font */ }
  ctx.clearRect(0, 0, w, h)
  ctx.textBaseline = 'alphabetic'

  try {
    if (state.templateId === 'split') renderSplit(ctx, state)
    else if (state.templateId === 'clean_brand') renderCleanBrand(ctx, state)
    else if (state.templateId === 'before_after') renderBeforeAfter(ctx, state)
    else renderPhotoHero(ctx, state)
  } catch (err) {
    console.error('Publicidad: fallo al dibujar la plantilla', err)
  }

  if (state.logoOn) {
    try { drawLogo(ctx, state.logoImg, state.format, state.logoPos, state.logoSize, state.logoVariant) }
    catch (err) { console.error('Publicidad: fallo al dibujar el logo', err) }
  }
}

function Collapsible({ title, defaultOpen, children }) {
  const [open, setOpen] = useState(!!defaultOpen)
  return (
    <div className="rounded-2xl bg-white border border-ink/10 overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between px-4 h-12 text-left">
        <span className="text-xs font-extrabold uppercase tracking-wide text-ink/70">{title}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-ink/40 transition-transform ${open ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && <div className="px-4 pb-4 grid gap-3.5 border-t border-ink/10 pt-3.5">{children}</div>}
    </div>
  )
}

function OptionRow({ options, value, onChange, labels }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)} className={`h-8 px-3 rounded-md border text-[11px] font-bold capitalize ${value === o ? 'border-gold bg-gold/15 text-ink' : 'border-ink/15 text-ink/60 hover:border-ink/30'}`}>
          {labels ? labels[o] : o}
        </button>
      ))}
    </div>
  )
}

function PhotoField({ label, photo, setPhoto }) {
  async function onUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const img = await loadFile(file)
    setPhoto((p) => ({ ...p, img, dragX: 0, dragY: 0 }))
  }
  return (
    <Field label={label}>
      <div className="grid gap-2">
        <div className="flex items-center gap-2">
          <label className="flex-1 flex items-center gap-2 h-11 px-3 rounded-lg border border-ink/20 cursor-pointer text-sm font-semibold text-ink/70 hover:border-ink">
            <Icon name="image" size={16} /> {photo.img ? 'Cambiar foto…' : 'Subir foto…'}
            <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
          </label>
          {photo.img && (
            <button type="button" onClick={() => setPhoto(emptyPhoto())} aria-label="Eliminar foto" className="grid place-items-center w-11 h-11 rounded-lg border border-ink/15 hover:border-red-600 hover:text-red-600">
              <Icon name="trash" size={15} />
            </button>
          )}
        </div>
        {photo.img && (
          <div className="grid gap-1.5">
            <OptionRow options={['cover', 'contain']} value={photo.fit} onChange={(fit) => setPhoto((p) => ({ ...p, fit }))} labels={{ cover: 'Cover', contain: 'Contain' }} />
            <OptionRow options={['center', 'top', 'bottom', 'left', 'right']} value={photo.pos} onChange={(pos) => setPhoto((p) => ({ ...p, pos }))} labels={{ center: 'Center', top: 'Top', bottom: 'Bottom', left: 'Left', right: 'Right' }} />
          </div>
        )}
      </div>
    </Field>
  )
}

export default function SocialDoc() {
  const canvasRef = useRef(null)
  const dragRef = useRef(null)

  const [formatId, setFormatId] = useState('ig_post')
  const [pieceLang, setPieceLang] = useState('es')
  const [adType, setAdType] = useState('general')
  const [templateId, setTemplateId] = useState('clean_brand')
  const [style, setStyle] = useState('dark')

  const [serviceId, setServiceId] = useState('')
  const [photo, setPhoto] = useState(emptyPhoto)
  const [photoBefore, setPhotoBefore] = useState(emptyPhoto)
  const [photoAfter, setPhotoAfter] = useState(emptyPhoto)
  const [orientation, setOrientation] = useState('vertical')

  const [title, setTitle] = useState(() => content.es.hero.titleLines.join('\n'))
  const [subtitle, setSubtitle] = useState(() => content.es.hero.sub)
  const [description, setDescription] = useState('')
  const [autoSource, setAutoSource] = useState('hero')
  const [price, setPrice] = useState('')
  const [oldPrice, setOldPrice] = useState('')
  const [showOldPrice, setShowOldPrice] = useState(false)
  const [validity, setValidity] = useState('')
  const [showValidity, setShowValidity] = useState(false)
  const [beforeLabel, setBeforeLabel] = useState('ANTES')
  const [afterLabel, setAfterLabel] = useState('DESPUÉS')

  const [overlay, setOverlay] = useState(30)
  const [textAlign, setTextAlign] = useState('center')
  const [titleSize, setTitleSize] = useState('medium')
  const [safeGuide, setSafeGuide] = useState(false)

  const [logoOn, setLogoOn] = useState(true)
  const [logoVariant, setLogoVariant] = useState('full')
  const [logoPos, setLogoPos] = useState('top_left')
  const [logoSize, setLogoSize] = useState('medium')
  const [showPhone, setShowPhone] = useState(true)
  const [showWebsite, setShowWebsite] = useState(true)
  const [showLocation, setShowLocation] = useState(false)
  const [ctaType, setCtaType] = useState('quote')
  const [ctaCustom, setCtaCustom] = useState('')

  const [logoImg, setLogoImg] = useState(null)
  const [exportFormat, setExportFormat] = useState('png')
  const [presets, setPresets] = useState(loadPresets)
  const [presetName, setPresetName] = useState('')

  const format = FORMATS.find((f) => f.id === formatId) || FORMATS[0]
  const SERVICES = content[pieceLang].services.filter((s) => !s.hidden)

  useEffect(() => { loadLogo().then(setLogoImg) }, [])
  useEffect(() => { setBeforeLabel(pieceLang === 'es' ? 'ANTES' : 'BEFORE'); setAfterLabel(pieceLang === 'es' ? 'DESPUÉS' : 'AFTER') }, [pieceLang])

  // Re-translate the auto-filled title/subtitle when the piece language changes,
  // but only while they still come from the hero default or a selected service —
  // once the staff member edits them by hand, the language toggle leaves them alone.
  useEffect(() => {
    if (autoSource === 'hero') {
      setTitle(content[pieceLang].hero.titleLines.join('\n'))
      setSubtitle(content[pieceLang].hero.sub)
    } else if (autoSource) {
      const s = content[pieceLang].services.find((x) => x.id === autoSource)
      if (s) { setTitle(s.title); if (adType === 'promo') setDescription(s.lead); else setSubtitle(s.lead) }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pieceLang])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    render(canvas, {
      format, pieceLang, adType, templateId, style, photo, photoBefore, photoAfter, orientation,
      title, subtitle, description, price, oldPrice, showOldPrice, validity, showValidity, beforeLabel, afterLabel,
      overlay, textAlign, titleSize, logoOn, logoVariant, logoPos, logoSize, showPhone, showWebsite, showLocation, ctaType, ctaCustom, logoImg,
    })
  }, [format, pieceLang, adType, templateId, style, photo, photoBefore, photoAfter, orientation, title, subtitle, description, price, oldPrice, showOldPrice, validity, showValidity, beforeLabel, afterLabel, overlay, textAlign, titleSize, logoOn, logoVariant, logoPos, logoSize, showPhone, showWebsite, showLocation, ctaType, ctaCustom, logoImg])

  function selectAdType(t) {
    setAdType(t)
    if (t === 'before_after') setTemplateId('before_after')
    else if (templateId === 'before_after') setTemplateId('clean_brand')
  }

  function onSelectService(id) {
    setServiceId(id)
    const s = SERVICES.find((x) => x.id === id)
    if (!s) return
    setAutoSource(id)
    setTitle(s.title)
    if (adType === 'promo') { setDescription(s.lead); if (s.price) setPrice(`${content[pieceLang].from} ${s.price}`) }
    else setSubtitle(s.lead)
  }

  function frameAt(x, y) {
    const frames = computeFrames(format, templateId, orientation)
    if (templateId === 'before_after') {
      if (x >= frames.before.x && x <= frames.before.x + frames.before.w && y >= frames.before.y && y <= frames.before.y + frames.before.h) return 'before'
      if (x >= frames.after.x && x <= frames.after.x + frames.after.w && y >= frames.after.y && y <= frames.after.y + frames.after.h) return 'after'
      return null
    }
    return 'main'
  }

  function activePhotoFor(target) {
    if (target === 'before') return photoBefore
    if (target === 'after') return photoAfter
    return photo
  }
  function setterFor(target) {
    if (target === 'before') return setPhotoBefore
    if (target === 'after') return setPhotoAfter
    return setPhoto
  }

  function handlePointerDown(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = format.w / rect.width
    const scaleY = format.h / rect.height
    const cx = (e.clientX - rect.left) * scaleX
    const cy = (e.clientY - rect.top) * scaleY
    const target = frameAt(cx, cy)
    if (!target) return
    const ph = activePhotoFor(target)
    if (!ph.img || ph.fit !== 'cover') return
    dragRef.current = { target, startX: e.clientX, startY: e.clientY, scaleX, scaleY, origX: ph.dragX || 0, origY: ph.dragY || 0 }
    canvas.setPointerCapture?.(e.pointerId)
  }
  function handlePointerMove(e) {
    if (!dragRef.current) return
    const { target, startX, startY, scaleX, scaleY, origX, origY } = dragRef.current
    const dx = (e.clientX - startX) * scaleX
    const dy = (e.clientY - startY) * scaleY
    setterFor(target)((p) => ({ ...p, dragX: origX + dx, dragY: origY + dy }))
  }
  function handlePointerUp() { dragRef.current = null }

  function exportImage() {
    const canvas = canvasRef.current
    const type = exportFormat === 'jpg' ? 'image/jpeg' : 'image/png'
    const dataUrl = canvas.toDataURL(type, exportFormat === 'jpg' ? 0.92 : undefined)
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `${BUSINESS.replace(/\s+/g, '-')}-${formatId}-${Date.now()}.${exportFormat}`
    a.click()
  }

  function savePreset() {
    if (!presetName.trim()) return
    const p = { id: Date.now(), name: presetName.trim(), formatId, templateId, style, textAlign, titleSize, logoOn, logoVariant, logoPos, logoSize, overlay, showPhone, showWebsite, showLocation, ctaType, ctaCustom }
    const list = [...presets, p]
    setPresets(list); savePresetsList(list); setPresetName('')
  }
  function applyPreset(p) {
    setFormatId(p.formatId); setTemplateId(p.templateId); setStyle(p.style); setTextAlign(p.textAlign); setTitleSize(p.titleSize)
    setLogoOn(p.logoOn); setLogoVariant(p.logoVariant || 'full'); setLogoPos(p.logoPos); setLogoSize(p.logoSize); setOverlay(p.overlay)
    setShowPhone(p.showPhone); setShowWebsite(p.showWebsite); setShowLocation(p.showLocation); setCtaType(p.ctaType); setCtaCustom(p.ctaCustom || '')
  }
  function deletePreset(id) {
    const list = presets.filter((p) => p.id !== id)
    setPresets(list); savePresetsList(list)
  }

  const tall = format.h > format.w * 1.3
  const previewMaxW = tall ? 300 : format.w > format.h ? 460 : 420

  return (
    <div className="grid lg:grid-cols-[380px_1fr] gap-5 items-start">
      <div className="grid gap-3.5 order-2 lg:order-1">
        <div className="rounded-2xl bg-white border border-ink/10 p-4 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs font-extrabold uppercase tracking-wide text-ink/70">Idioma de la pieza</span>
          <OptionRow options={['es', 'en']} value={pieceLang} onChange={setPieceLang} labels={{ es: 'Español', en: 'English' }} />
        </div>

        <Collapsible title="Formato">
          <div className="grid grid-cols-2 gap-2">
            {FORMATS.map((f) => (
              <button key={f.id} type="button" onClick={() => setFormatId(f.id)} className={`h-16 rounded-lg border-2 px-2 text-left ${formatId === f.id ? 'border-gold bg-gold/15' : 'border-ink/15 hover:border-ink/30'}`}>
                <p className="text-[11px] font-bold text-ink leading-tight">{f.label}</p>
                <p className="text-[10px] text-ink/50">{f.w} × {f.h}</p>
              </button>
            ))}
          </div>
        </Collapsible>

        <Collapsible title="Contenido" defaultOpen>
          <Field label="Tipo de publicidad">
            <div className="flex flex-wrap gap-1.5">
              {AD_TYPES.map((t) => (
                <button key={t.id} type="button" onClick={() => selectAdType(t.id)} className={`h-9 px-3 rounded-full border text-xs font-bold ${adType === t.id ? 'bg-ink text-gold border-ink' : 'bg-white border-ink/15 hover:border-ink'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </Field>

          {(adType === 'service' || adType === 'promo') && (
            <Field label={adType === 'promo' ? 'Servicio (opcional)' : 'Servicio a promocionar'}>
              <select className={inputCls} value={serviceId} onChange={(e) => onSelectService(e.target.value)}>
                <option value="">— Seleccionar —</option>
                {SERVICES.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </Field>
          )}

          {adType === 'before_after' ? (
            <>
              <PhotoField label="Foto BEFORE" photo={photoBefore} setPhoto={setPhotoBefore} />
              <PhotoField label="Foto AFTER" photo={photoAfter} setPhoto={setPhotoAfter} />
              <Field label="Orientación">
                <OptionRow options={['vertical', 'horizontal']} value={orientation} onChange={setOrientation} labels={{ vertical: 'Vertical split', horizontal: 'Horizontal split' }} />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Etiqueta BEFORE"><input className={inputCls} value={beforeLabel} onChange={(e) => setBeforeLabel(e.target.value)} /></Field>
                <Field label="Etiqueta AFTER"><input className={inputCls} value={afterLabel} onChange={(e) => setAfterLabel(e.target.value)} /></Field>
              </div>
              <Field label="Título (opcional)"><input className={inputCls} value={title} onChange={(e) => { setAutoSource(null); setTitle(e.target.value) }} /></Field>
            </>
          ) : (
            <PhotoField label="Foto" photo={photo} setPhoto={setPhoto} />
          )}

          {adType === 'promo' ? (
            <>
              <Field label="Título"><input className={inputCls} value={title} onChange={(e) => { setAutoSource(null); setTitle(e.target.value) }} /></Field>
              <Field label="Descripción"><textarea rows="2" className={`${inputCls} w-full h-auto py-2`} value={description} onChange={(e) => { setAutoSource(null); setDescription(e.target.value) }} /></Field>
              <Field label="Precio / Oferta"><input className={inputCls} placeholder="Desde $700" value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
              <label className="flex items-center gap-2 text-sm text-ink/80"><input type="checkbox" checked={showOldPrice} onChange={(e) => setShowOldPrice(e.target.checked)} className="w-4 h-4 accent-[var(--color-gold)]" /> Mostrar precio anterior</label>
              {showOldPrice && <Field label="Precio anterior"><input className={inputCls} value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} /></Field>}
              <label className="flex items-center gap-2 text-sm text-ink/80"><input type="checkbox" checked={showValidity} onChange={(e) => setShowValidity(e.target.checked)} className="w-4 h-4 accent-[var(--color-gold)]" /> Mostrar vigencia</label>
              {showValidity && <Field label="Vigencia"><input className={inputCls} placeholder="Válido hasta el 31 de octubre" value={validity} onChange={(e) => setValidity(e.target.value)} /></Field>}
            </>
          ) : adType !== 'before_after' && (
            <>
              <Field label="Título"><textarea rows="2" className={`${inputCls} w-full h-auto py-2`} value={title} onChange={(e) => { setAutoSource(null); setTitle(e.target.value) }} /></Field>
              <Field label="Subtítulo"><textarea rows="2" className={`${inputCls} w-full h-auto py-2`} value={subtitle} onChange={(e) => { setAutoSource(null); setSubtitle(e.target.value) }} /></Field>
            </>
          )}
        </Collapsible>

        <Collapsible title="Diseño">
          {adType === 'before_after' ? (
            <p className="text-xs text-ink/50">Plantilla: Before &amp; After (automática para este tipo de publicidad)</p>
          ) : (
            <Field label="Plantilla">
              <div className="grid grid-cols-3 gap-2">
                {TEMPLATES.map((t) => (
                  <button key={t.id} type="button" onClick={() => setTemplateId(t.id)} className={`h-12 rounded-lg border-2 text-[11px] font-bold px-1 ${templateId === t.id ? 'border-gold bg-gold/15 text-ink' : 'border-ink/15 text-ink/60 hover:border-ink/30'}`}>{t.label}</button>
                ))}
              </div>
            </Field>
          )}

          {(templateId === 'split' || templateId === 'clean_brand') && (
            <Field label="Estilo">
              <OptionRow options={['dark', 'light', 'photo']} value={style} onChange={setStyle} labels={{ dark: 'Dark', light: 'Light', photo: 'Photo' }} />
            </Field>
          )}

          {templateId !== 'before_after' && (
            <Field label={`Overlay — ${overlay}%`}>
              <input type="range" min="0" max="70" value={overlay} onChange={(e) => setOverlay(Number(e.target.value))} className="accent-[var(--color-gold)]" />
            </Field>
          )}

          <Field label="Alineación de texto">
            <OptionRow options={['left', 'center', 'right']} value={textAlign} onChange={setTextAlign} labels={{ left: 'Left', center: 'Center', right: 'Right' }} />
          </Field>
          <Field label="Tamaño del título">
            <OptionRow options={['small', 'medium', 'large']} value={titleSize} onChange={setTitleSize} labels={{ small: 'Small', medium: 'Medium', large: 'Large' }} />
          </Field>

          {tall && (
            <label className="flex items-center gap-2 text-sm text-ink/80"><input type="checkbox" checked={safeGuide} onChange={(e) => setSafeGuide(e.target.checked)} className="w-4 h-4 accent-[var(--color-gold)]" /> Ver guías de zona segura (no se exportan)</label>
          )}
        </Collapsible>

        <Collapsible title="Marca">
          <label className="flex items-center gap-2 text-sm text-ink/80"><input type="checkbox" checked={logoOn} onChange={(e) => setLogoOn(e.target.checked)} className="w-4 h-4 accent-[var(--color-gold)]" /> Mostrar logo</label>
          {logoOn && (
            <>
              <Field label="Versión del logo">
                <OptionRow options={['full', 'icon']} value={logoVariant} onChange={setLogoVariant} labels={{ full: 'Logo completo', icon: 'Ícono' }} />
              </Field>
              <Field label="Posición del logo">
                <div className="grid grid-cols-3 gap-1.5">
                  {['top_left', 'top_center', 'top_right', 'bottom_left', 'bottom_center', 'bottom_right'].map((p) => (
                    <button key={p} type="button" onClick={() => setLogoPos(p)} className={`h-9 rounded-md border text-[10px] font-bold ${logoPos === p ? 'border-gold bg-gold/15' : 'border-ink/15 text-ink/60'}`}>{p.replace('_', ' ')}</button>
                  ))}
                </div>
              </Field>
              <Field label="Tamaño del logo">
                <OptionRow options={['small', 'medium', 'large']} value={logoSize} onChange={setLogoSize} labels={{ small: 'Small', medium: 'Medium', large: 'Large' }} />
              </Field>
            </>
          )}

          <div className="border-t border-ink/10 pt-3 grid gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-ink/50">Brand info</p>
            <label className="flex items-center gap-2 text-sm text-ink/80"><input type="checkbox" checked={showPhone} onChange={(e) => setShowPhone(e.target.checked)} className="w-4 h-4 accent-[var(--color-gold)]" /> Phone</label>
            <label className="flex items-center gap-2 text-sm text-ink/80"><input type="checkbox" checked={showWebsite} onChange={(e) => setShowWebsite(e.target.checked)} className="w-4 h-4 accent-[var(--color-gold)]" /> Website</label>
            <label className="flex items-center gap-2 text-sm text-ink/80"><input type="checkbox" checked={showLocation} onChange={(e) => setShowLocation(e.target.checked)} className="w-4 h-4 accent-[var(--color-gold)]" /> Location</label>
          </div>

          <Field label="Llamado a la acción">
            <div className="flex flex-wrap gap-1.5">
              {CTA_TYPES.map((c) => (
                <button key={c} type="button" onClick={() => setCtaType(c)} className={`h-8 px-3 rounded-md border text-[11px] font-bold ${ctaType === c ? 'border-gold bg-gold/15' : 'border-ink/15 text-ink/60'}`}>{CTA_BUTTON_LABEL[c]}</button>
              ))}
            </div>
          </Field>
          {ctaType === 'custom' && <Field label="CTA personalizado"><input className={inputCls} value={ctaCustom} onChange={(e) => setCtaCustom(e.target.value)} /></Field>}
        </Collapsible>

        <div className="rounded-2xl bg-white border border-ink/10 p-4 grid gap-3.5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-ink/70">Exportar</p>
          <Field label="Formato de archivo">
            <OptionRow options={['png', 'jpg']} value={exportFormat} onChange={setExportFormat} labels={{ png: 'PNG', jpg: 'JPG' }} />
          </Field>
          <button onClick={exportImage} className="inline-flex items-center justify-center gap-2 h-12 rounded-full bg-gold text-ink font-bold"><Icon name="arrowRight" size={16} /> Exportar imagen</button>

          <div className="border-t border-ink/10 pt-3 grid gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-ink/50">Mis plantillas</p>
            <div className="flex gap-2">
              <input placeholder="Nombre de la plantilla" className={`${inputCls} flex-1`} value={presetName} onChange={(e) => setPresetName(e.target.value)} />
              <button type="button" onClick={savePreset} className="h-11 px-3 rounded-lg border border-ink/20 text-sm font-bold whitespace-nowrap">Guardar</button>
            </div>
            {presets.length > 0 && (
              <div className="grid gap-1.5">
                {presets.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 rounded-lg border border-ink/10 px-2.5 py-1.5">
                    <button type="button" onClick={() => applyPreset(p)} className="flex-1 text-left text-sm font-semibold text-ink hover:underline">{p.name}</button>
                    <button type="button" onClick={() => deletePreset(p.id)} aria-label="Eliminar plantilla" className="grid place-items-center w-8 h-8 rounded-md border border-ink/15 hover:border-red-600 hover:text-red-600"><Icon name="trash" size={13} /></button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-ink/40">Guardadas en este navegador (no se sincronizan entre dispositivos).</p>
          </div>
        </div>
      </div>

      <div className="order-1 lg:order-2 lg:sticky lg:top-4 grid place-items-center rounded-2xl bg-mist border border-ink/10 p-6">
        <div className="relative" style={{ width: '100%', maxWidth: previewMaxW }}>
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="w-full rounded-lg shadow-sm touch-none"
            style={{ aspectRatio: `${format.w} / ${format.h}`, height: 'auto', cursor: 'grab' }}
          />
          {tall && safeGuide && (
            <>
              <div className="absolute left-0 right-0 top-0 border-b-2 border-dashed border-red-500/70" style={{ height: '13%' }} />
              <div className="absolute left-0 right-0 bottom-0 border-t-2 border-dashed border-red-500/70" style={{ height: '18%' }} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
