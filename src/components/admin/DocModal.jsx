import { useState } from 'react'
import Icon from '../Icon'
import { previewDocHtml, printDoc } from './print'

export default function DocModal({ title, html, onClose }) {
  const [mode, setMode] = useState('choice') // choice | preview

  function download() {
    printDoc(html, title)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4" onClick={onClose}>
      <div className={`w-full ${mode === 'preview' ? 'max-w-3xl h-[85vh]' : 'max-w-sm'} bg-white rounded-2xl overflow-hidden flex flex-col`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 h-14 border-b border-ink/10 shrink-0">
          <h3 className="font-bold text-ink truncate">{title}</h3>
          <button onClick={onClose} aria-label="Cerrar" className="grid place-items-center w-8 h-8 rounded-full border border-ink/15 hover:border-ink shrink-0"><Icon name="x" size={16} /></button>
        </div>

        {mode === 'choice' ? (
          <div className="p-6 grid gap-3">
            <button onClick={() => setMode('preview')} className="h-14 rounded-xl border-2 border-ink/15 hover:border-ink font-bold text-ink flex items-center justify-center gap-2"><Icon name="image" size={18} /> Visualizar</button>
            <button onClick={download} className="h-14 rounded-xl bg-gold text-ink font-bold flex items-center justify-center gap-2"><Icon name="arrowRight" size={18} /> Descargar PDF</button>
          </div>
        ) : (
          <>
            <iframe title={title} srcDoc={previewDocHtml(html)} className="flex-1 w-full border-0" />
            <div className="flex gap-2 p-3 border-t border-ink/10 shrink-0">
              <button onClick={() => setMode('choice')} className="h-11 px-4 rounded-lg border border-ink/20 font-bold text-sm">← Volver</button>
              <button onClick={download} className="h-11 px-5 rounded-lg bg-gold text-ink font-bold text-sm ml-auto">Descargar PDF</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
