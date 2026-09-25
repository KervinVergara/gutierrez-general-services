import { useEffect, useState } from 'react'
import LegalPage from './LegalPage'
import { BUSINESS, PHONE_DISPLAY, PHONE_TEL } from '../content'

function detectLang() {
  const saved = localStorage.getItem('lang')
  if (saved) return saved
  return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en'
}

const UPDATED = { en: 'September 24, 2026', es: '24 de septiembre de 2026' }

export default function Privacy() {
  const [lang] = useState(detectLang)
  useEffect(() => { document.documentElement.lang = lang; document.title = `${lang === 'es' ? 'Política de Privacidad' : 'Privacy Policy'} — ${BUSINESS}` }, [lang])

  return (
    <LegalPage lang={lang} updated={UPDATED[lang]} title={lang === 'es' ? 'Política de Privacidad' : 'Privacy Policy'}>
      {lang === 'es' ? (
        <>
          <p>{BUSINESS} ("nosotros", "nuestro") opera el sitio web gutierrezgeneralservices.com. Esta política explica qué información recopilamos a través del sitio, cómo la usamos y cómo la protegemos.</p>

          <h2 className="text-xl font-bold text-ink mt-8">Qué información recopilamos</h2>
          <p>Cuando completas el formulario de cotización en nuestro sitio, recopilamos la información que tú mismo nos proporcionas: nombre, número de teléfono, correo electrónico (si lo incluyes), código postal, el servicio que te interesa, y cualquier mensaje o detalle adicional que escribas. No pedimos datos de pago ni información financiera a través del sitio.</p>
          <p>El sitio también registra automáticamente información técnica básica (como el tipo de navegador) necesaria para procesar tu solicitud correctamente.</p>

          <h2 className="text-xl font-bold text-ink mt-8">Cómo usamos tu información</h2>
          <p>Usamos la información que envías únicamente para:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Contactarte y darte seguimiento a tu solicitud de cotización.</li>
            <li>Coordinar y programar el servicio que solicitaste.</li>
            <li>Mantener un registro interno de clientes y trabajos realizados.</li>
          </ul>
          <p>No vendemos, alquilamos ni compartimos tu información personal con terceros con fines de marketing.</p>

          <h2 className="text-xl font-bold text-ink mt-8">Dónde se almacena tu información</h2>
          <p>La información que envías se guarda en Firebase (un servicio de Google Cloud) mediante conexión cifrada (HTTPS). El acceso a esos datos está restringido únicamente al personal autorizado de {BUSINESS}, mediante inicio de sesión protegido con contraseña.</p>

          <h2 className="text-xl font-bold text-ink mt-8">Cookies y rastreo</h2>
          <p>Este sitio no utiliza cookies de rastreo ni herramientas de publicidad de terceros. Únicamente guardamos tu preferencia de idioma (inglés/español) en el almacenamiento local de tu navegador, para recordarla en tu próxima visita.</p>

          <h2 className="text-xl font-bold text-ink mt-8">Tus derechos</h2>
          <p>Puedes solicitarnos en cualquier momento que te confirmemos qué información tenemos sobre ti, que la corrijamos, o que la eliminemos de nuestros registros, escribiéndonos o llamándonos a los datos de contacto abajo.</p>

          <h2 className="text-xl font-bold text-ink mt-8">Cambios a esta política</h2>
          <p>Podemos actualizar esta política ocasionalmente. La fecha de "última actualización" al inicio de esta página siempre reflejará la versión vigente.</p>

          <h2 className="text-xl font-bold text-ink mt-8">Contacto</h2>
          <p>Si tienes preguntas sobre esta política de privacidad, contáctanos:</p>
          <p>{BUSINESS} — Warsaw, Indiana<br />
            Teléfono: <a href={`tel:${PHONE_TEL}`} className="underline">{PHONE_DISPLAY}</a></p>
        </>
      ) : (
        <>
          <p>{BUSINESS} ("we", "us", "our") operates the website gutierrezgeneralservices.com. This policy explains what information we collect through the site, how we use it, and how we protect it.</p>

          <h2 className="text-xl font-bold text-ink mt-8">Information we collect</h2>
          <p>When you fill out the quote form on our site, we collect the information you provide: name, phone number, email (if included), zip code, the service you're interested in, and any message or details you write. We do not ask for payment or financial information through the site.</p>
          <p>The site also automatically logs basic technical information (like browser type) needed to process your request correctly.</p>

          <h2 className="text-xl font-bold text-ink mt-8">How we use your information</h2>
          <p>We use the information you submit only to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Contact you and follow up on your quote request.</li>
            <li>Coordinate and schedule the service you requested.</li>
            <li>Keep an internal record of clients and completed jobs.</li>
          </ul>
          <p>We do not sell, rent, or share your personal information with third parties for marketing purposes.</p>

          <h2 className="text-xl font-bold text-ink mt-8">Where your information is stored</h2>
          <p>Information you submit is stored in Firebase (a Google Cloud service) over an encrypted (HTTPS) connection. Access to that data is restricted to authorized {BUSINESS} staff through password-protected login.</p>

          <h2 className="text-xl font-bold text-ink mt-8">Cookies and tracking</h2>
          <p>This site does not use tracking cookies or third-party advertising tools. We only save your language preference (English/Spanish) in your browser's local storage, so we can remember it on your next visit.</p>

          <h2 className="text-xl font-bold text-ink mt-8">Your rights</h2>
          <p>You can ask us at any time to confirm what information we have about you, to correct it, or to remove it from our records, by writing or calling us using the contact details below.</p>

          <h2 className="text-xl font-bold text-ink mt-8">Changes to this policy</h2>
          <p>We may update this policy from time to time. The "last updated" date at the top of this page always reflects the current version.</p>

          <h2 className="text-xl font-bold text-ink mt-8">Contact</h2>
          <p>If you have questions about this privacy policy, contact us:</p>
          <p>{BUSINESS} — Warsaw, Indiana<br />
            Phone: <a href={`tel:${PHONE_TEL}`} className="underline">{PHONE_DISPLAY}</a></p>
        </>
      )}
    </LegalPage>
  )
}
