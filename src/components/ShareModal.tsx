interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  shareText: string
}

const ShareModal = ({ isOpen, onClose, shareText }: ShareModalProps) => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText)
      alert('Texto copiado al portapapeles')
    } catch {
      alert('No se pudo copiar el texto. Usa Ctrl+C manualmente.')
    }
  }

  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Compartir resultado</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">Selecciona un canal</h2>
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

        <p className="mt-4 text-sm text-slate-600">Copia o comparte este resultado con amigos en móviles y redes sociales.</p>

        <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-slate-100 p-4">
          <textarea
            readOnly
            value={shareText}
            className="h-36 w-full resize-none rounded-[1.25rem] border border-transparent bg-transparent p-3 text-sm text-slate-900 outline-none"
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-[1.5rem] bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Copiar
          </button>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-[1.5rem] border border-slate-900 px-4 py-3 text-center text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
          >
            WhatsApp
          </a>
          <a
            href={tweetUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-[1.5rem] border border-sky-600 bg-sky-50 px-4 py-3 text-center text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
          >
            Twitter
          </a>
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-[1.5rem] border border-sky-600 bg-white px-4 py-3 text-center text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
          >
            Telegram
          </a>
          <a
            href={`mailto:?subject=${encodeURIComponent('Mi resultado en SeONose')}&body=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-[1.5rem] border border-slate-900 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
          >
            Email
          </a>
        </div>

        {navigator.share && (
          <div className="mt-4">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.share({ text: shareText })
                } catch {
                  alert('No se pudo completar el compartir nativo.')
                }
              }}
              className="w-full rounded-[1.5rem] bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Compartir en el dispositivo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ShareModal
