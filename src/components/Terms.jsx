import { useEffect, useState } from 'react'
import LegalPage from './LegalPage'
import { BUSINESS, PHONE_DISPLAY, PHONE_TEL } from '../content'

function detectLang() {
  const saved = localStorage.getItem('lang')
  if (saved) return saved
  return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en'
}

const UPDATED = { en: 'September 24, 2026', es: '24 de septiembre de 2026' }

export default function Terms() {
  const [lang] = useState(detectLang)
  useEffect(() => { document.documentElement.lang = lang; document.title = `${lang === 'es' ? 'Términos de Servicio' : 'Terms of Service'} — ${BUSINESS}` }, [lang])

  return (
    <LegalPage lang={lang} updated={UPDATED[lang]} title={lang === 'es' ? 'Términos de Servicio' : 'Terms of Service'}>
      {lang === 'es' ? (
        <>
          <p>Estos Términos de Servicio rigen el uso del sitio web gutierrezgeneralservices.com y la relación entre {BUSINESS} y sus clientes. Al enviar el formulario de cotización o contratar nuestros servicios, aceptas estos términos.</p>

          <h2 className="text-xl font-bold text-ink mt-8">Cotizaciones</h2>
          <p>Los precios "desde" mostrados en el sitio son estimados de referencia. El precio final se confirma después de evaluar el vehículo, la propiedad o el trabajo específico, y puede variar según tamaño, condición y alcance del servicio.</p>

          <h2 className="text-xl font-bold text-ink mt-8">Programación y cancelaciones</h2>
          <p>Las citas se coordinan por teléfono, mensaje de texto o WhatsApp después de recibir tu solicitud. Te pedimos avisar con la mayor anticipación posible si necesitas reprogramar o cancelar una cita.</p>

          <h2 className="text-xl font-bold text-ink mt-8">Responsabilidad del cliente</h2>
          <p>Para servicios de detallado de vehículos, el cliente es responsable de retirar objetos de valor, documentos personales u objetos frágiles del vehículo antes del servicio. Para servicios de propiedad (limpieza exterior, canaletas, remoción de nieve, etc.), el cliente debe informarnos de cualquier condición o riesgo conocido del área de trabajo.</p>

          <h2 className="text-xl font-bold text-ink mt-8">Limitación de responsabilidad</h2>
          <p>{BUSINESS} realiza sus servicios con cuidado profesional. No nos hacemos responsables por daños preexistentes no informados, ni por objetos de valor dejados en el vehículo o propiedad durante el servicio.</p>

          <h2 className="text-xl font-bold text-ink mt-8">Uso del sitio web</h2>
          <p>El contenido de este sitio (textos, fotos, diseño) es propiedad de {BUSINESS} y no debe copiarse ni usarse sin autorización. El formulario de contacto debe usarse únicamente para solicitudes de cotización genuinas.</p>

          <h2 className="text-xl font-bold text-ink mt-8">Cambios a estos términos</h2>
          <p>Podemos actualizar estos términos ocasionalmente. La fecha de "última actualización" al inicio de esta página siempre reflejará la versión vigente.</p>

          <h2 className="text-xl font-bold text-ink mt-8">Contacto</h2>
          <p>{BUSINESS} — Warsaw, Indiana<br />
            Teléfono: <a href={`tel:${PHONE_TEL}`} className="underline">{PHONE_DISPLAY}</a></p>
        </>
      ) : (
        <>
          <p>These Terms of Service govern the use of the website gutierrezgeneralservices.com and the relationship between {BUSINESS} and its customers. By submitting the quote form or booking our services, you agree to these terms.</p>

          <h2 className="text-xl font-bold text-ink mt-8">Quotes</h2>
          <p>The "from" prices shown on the site are reference estimates. The final price is confirmed after evaluating the vehicle, property, or specific job, and may vary based on size, condition, and scope of service.</p>

          <h2 className="text-xl font-bold text-ink mt-8">Scheduling and cancellations</h2>
          <p>Appointments are coordinated by phone, text, or WhatsApp after we receive your request. Please let us know as early as possible if you need to reschedule or cancel an appointment.</p>

          <h2 className="text-xl font-bold text-ink mt-8">Customer responsibility</h2>
          <p>For vehicle detailing services, the customer is responsible for removing valuables, personal documents, or fragile items from the vehicle before service. For property services (exterior cleaning, gutters, snow removal, etc.), the customer must inform us of any known hazards or conditions in the work area.</p>

          <h2 className="text-xl font-bold text-ink mt-8">Limitation of liability</h2>
          <p>{BUSINESS} performs its services with professional care. We are not responsible for pre-existing, unreported damage, or for valuables left in the vehicle or property during service.</p>

          <h2 className="text-xl font-bold text-ink mt-8">Use of the website</h2>
          <p>The content of this site (text, photos, design) is the property of {BUSINESS} and may not be copied or used without permission. The contact form is intended for genuine quote requests only.</p>

          <h2 className="text-xl font-bold text-ink mt-8">Changes to these terms</h2>
          <p>We may update these terms from time to time. The "last updated" date at the top of this page always reflects the current version.</p>

          <h2 className="text-xl font-bold text-ink mt-8">Contact</h2>
          <p>{BUSINESS} — Warsaw, Indiana<br />
            Phone: <a href={`tel:${PHONE_TEL}`} className="underline">{PHONE_DISPLAY}</a></p>
        </>
      )}
    </LegalPage>
  )
}
