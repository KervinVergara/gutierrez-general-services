import { BUSINESS, PHONE_DISPLAY, PHONE_TEL } from '../content'

// Shared shell for /privacy and /terms — same look as the main site, minimal
// so these pages stay easy to keep up to date.
export default function LegalPage({ lang, title, updated, children }) {
  return (
    <div className="min-h-screen bg-sand flex flex-col">
      <header className="border-b border-ink/10 bg-sand">
        <div className="mx-auto max-w-3xl px-4 h-16 flex items-center justify-between">
          <a href="/" className="font-extrabold text-ink">{BUSINESS}</a>
          <a href="/" className="text-sm font-semibold text-ink/70 hover:text-ink">
            {lang === 'es' ? '← Volver al sitio' : '← Back to site'}
          </a>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-3xl px-4 py-12 md:py-16 w-full">
        <h1 className="text-3xl md:text-4xl font-extrabold text-ink">{title}</h1>
        <p className="mt-2 text-sm text-steel">
          {lang === 'es' ? `Última actualización: ${updated}` : `Last updated: ${updated}`}
        </p>
        <div className="mt-8 prose-legal text-ink/85 space-y-6 max-w-none">
          {children}
        </div>
      </main>

      <footer className="bg-sand text-steel text-sm border-t border-ink/10">
        <div className="mx-auto max-w-3xl px-4 py-6 flex flex-col md:flex-row justify-between gap-2">
          <p>© {new Date().getFullYear()} {BUSINESS}.</p>
          <p><a href={`tel:${PHONE_TEL}`} className="hover:underline">{PHONE_DISPLAY}</a></p>
        </div>
      </footer>
    </div>
  )
}
