import { useEffect, useRef, useState } from 'react'

import { EVENTOS, registrarEvento } from '../../lib/analytics'

interface CompartirProps {
  /** Texto completo (incluye el link). */
  texto: string
  link: string
  titulo: string
  /** Evento de analítica a registrar al compartir. */
  evento?: string
  /** Variante destacada (sala nueva, pocos integrantes) o compacta. */
  destacado?: boolean
}

const puedeCompartirNativo = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function'

/**
 * Invitar a la sala: compartir del sistema (en celular abre WhatsApp, Telegram,
 * etc.), WhatsApp directo y copiar el link. Copiar es el plan B universal:
 * funciona en cualquier navegador de escritorio.
 */
const CompartirSala = ({ texto, link, titulo, evento = EVENTOS.salaInvitacionCompartida, destacado = false }: CompartirProps) => {
  const [copiado, setCopiado] = useState<'ok' | 'error' | null>(null)
  const temporizador = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (temporizador.current) window.clearTimeout(temporizador.current)
    },
    []
  )

  const avisar = (estado: 'ok' | 'error') => {
    setCopiado(estado)
    if (temporizador.current) window.clearTimeout(temporizador.current)
    temporizador.current = window.setTimeout(() => setCopiado(null), 2500)
  }

  const compartirNativo = async () => {
    try {
      await navigator.share({ title: titulo, text: texto })
      registrarEvento(evento, { canal: 'nativo' })
    } catch (error) {
      // Cerrar el menú del sistema no es un error.
      if (error instanceof DOMException && error.name === 'AbortError') return
      console.error('No se pudo compartir:', error)
    }
  }

  const compartirWhatsApp = () => {
    registrarEvento(evento, { canal: 'whatsapp' })
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer')
  }

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(link)
      registrarEvento(evento, { canal: 'copiar' })
      avisar('ok')
    } catch (error) {
      console.error('No se pudo copiar el link:', error)
      avisar('error')
    }
  }

  const boton = 'inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition'

  return (
    <div className={destacado ? 'space-y-3' : 'space-y-2'}>
      <div className={`grid gap-2 ${puedeCompartirNativo() ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {puedeCompartirNativo() && (
          <button type="button" onClick={() => void compartirNativo()} className={`${boton} bg-slate-900 text-white hover:bg-slate-700`}>
            <span aria-hidden>📤</span> Compartir
          </button>
        )}
        <button type="button" onClick={compartirWhatsApp} className={`${boton} bg-[#25D366] text-white hover:bg-[#1fb15b]`}>
          <span aria-hidden>💬</span> WhatsApp
        </button>
        <button
          type="button"
          onClick={() => void copiarLink()}
          className={`${boton} border border-slate-300 bg-white text-slate-900 hover:bg-slate-50`}
        >
          <span aria-hidden>🔗</span> Copiar link
        </button>
      </div>

      <p className="break-all rounded-xl bg-slate-100 px-3 py-2 text-center font-mono text-xs text-slate-600">{link}</p>

      <p role="status" aria-live="polite" className="min-h-[1.25rem] text-center text-sm font-semibold">
        {copiado === 'ok' && <span className="text-emerald-700">¡Link copiado! Pegalo en tu grupo.</span>}
        {copiado === 'error' && <span className="text-red-700">No pudimos copiarlo. Copialo a mano desde arriba.</span>}
      </p>
    </div>
  )
}

export default CompartirSala
