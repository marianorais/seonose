import { useState } from 'react'
import { marcarLinkCompartido, type CanalCompartir } from '../lib/analytics'
import { copiarTexto, compartirNativo, puedeCompartirNativo } from '../lib/compartir'
import { obtenerOrigenParaCompartir } from '../lib/siteConfig'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  /** Texto a compartir; el link lleva marcado el canal elegido. */
  textoPara: (canal: CanalCompartir) => string
  /** Se llama al elegir un canal, para medirlo. */
  onCompartir: (canal: CanalCompartir) => void
}

const ShareModal = ({ isOpen, onClose, textoPara, onCompartir }: ShareModalProps) => {
  const [copiado, setCopiado] = useState<'si' | 'error' | null>(null)

  if (!isOpen) return null

  const handleCopy = async () => {
    onCompartir('copiar')
    const ok = await copiarTexto(textoPara('copiar'))
    setCopiado(ok ? 'si' : 'error')
    window.setTimeout(() => setCopiado(null), 2000)
  }

  const shareText = textoPara('copiar')
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(textoPara('x'))}`
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(textoPara('whatsapp'))}`
  // Telegram exige `url`; el texto ya lo incluye, igual que antes.
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(marcarLinkCompartido(obtenerOrigenParaCompartir(), 'telegram'))}&text=${encodeURIComponent(textoPara('telegram'))}`
  const emailUrl = `mailto:?subject=${encodeURIComponent('¿Podés superarme en SEoNOSE?')}&body=${encodeURIComponent(textoPara('email'))}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Compartir resultado</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">Desafiá a tus amigos</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
            aria-label="Cerrar compartir"
          >
            ✕
          </button>
        </div>

        <p className="mt-4 text-sm text-slate-600">Mandale tu resultado a alguien y fijate si te supera. No incluye las respuestas.</p>

        <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-slate-100 p-4">
          <textarea
            readOnly
            value={shareText}
            aria-label="Texto para compartir"
            className="h-36 w-full resize-none rounded-[1.25rem] border border-transparent bg-transparent p-3 text-sm text-slate-900 outline-none"
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-[1.5rem] bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            {copiado === 'si' ? '¡Copiado!' : copiado === 'error' ? 'Copialo a mano' : 'Copiar'}
          </button>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => onCompartir('whatsapp')}
            className="rounded-[1.5rem] border border-slate-900 px-4 py-3 text-center text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
          >
            WhatsApp
          </a>
          <a
            href={tweetUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => onCompartir('x')}
            className="rounded-[1.5rem] border border-sky-600 bg-sky-50 px-4 py-3 text-center text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
          >
            X (Twitter)
          </a>
          <a
            href={telegramUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => onCompartir('telegram')}
            className="rounded-[1.5rem] border border-sky-600 bg-white px-4 py-3 text-center text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
          >
            Telegram
          </a>
          <a
            href={emailUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => onCompartir('email')}
            className="rounded-[1.5rem] border border-slate-900 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
          >
            Email
          </a>
        </div>

        {puedeCompartirNativo() && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => {
                onCompartir('nativo')
                void compartirNativo(textoPara('nativo'))
              }}
              className="w-full rounded-[1.5rem] bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Más opciones del dispositivo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ShareModal
