import { useState } from 'react'
import { guardarAlias } from '../lib/aliasHelpers'

interface AliasPromptProps {
  isOpen: boolean
  /** Identidad del jugador: es la clave con la que se guarda el alias. */
  playerId: string
  onClose: () => void
  /** Sólo cuando el alias quedó guardado, para refrescar el ranking. */
  onSaved: () => void
}

const MENSAJES_ERROR: Record<string, string> = {
  duplicado: 'Ese alias ya lo está usando otro jugador. Probá con otro.',
  'ya-tiene': 'Ya tenías un alias elegido.',
  vacio: 'Escribí un alias para continuar.',
  error: 'No pudimos guardar el alias. Intentá de nuevo en un momento.',
}

/**
 * `AliasPrompt` - Pide el nombre con el que el jugador aparece en el ranking.
 *
 * Se muestra mientras el jugador no tenga alias, y vuelve a aparecer en cada
 * visita hasta que ponga uno. No se acepta vacío ni sólo espacios. Una vez
 * guardado no se pide más.
 */
const AliasPrompt = ({ isOpen, playerId, onClose, onSaved }: AliasPromptProps) => {
  const [alias, setAlias] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (guardando) return

    // Segunda barrera contra el vacío, además del botón deshabilitado: cubre el
    // submit por Enter y el alias hecho sólo de espacios.
    if (alias.trim() === '') {
      setError(MENSAJES_ERROR.vacio)
      return
    }

    setGuardando(true)
    setError(null)

    const resultado = await guardarAlias(playerId, alias)

    setGuardando(false)

    if (!resultado.ok) {
      // Si ya tenía alias no tiene sentido seguir insistiendo.
      if (resultado.motivo === 'ya-tiene') {
        onSaved()
        onClose()
        return
      }

      setError(MENSAJES_ERROR[resultado.motivo] ?? MENSAJES_ERROR.error)
      return
    }

    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Ranking</p>
        <h2 className="mt-2 flex items-center gap-2 text-xl font-bold text-slate-900">
          <span aria-hidden>👤</span>
          <span>¿Cómo querés que te llamemos?</span>
        </h2>

        <p className="mt-3 text-sm text-slate-600">
          Elegí el nombre con el que vas a aparecer en el ranking. Después no se puede cambiar, así que
          elegilo con cariño.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <input
            type="text"
            value={alias}
            autoFocus
            onChange={(event) => {
              setAlias(event.target.value)
              setError(null)
            }}
            placeholder="Tu alias"
            aria-label="Tu alias"
            className="w-full rounded-[1.5rem] border border-slate-300 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
          />

          {error && (
            <p role="alert" className="rounded-[1.25rem] bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="submit"
              disabled={guardando || alias.trim() === ''}
              className="rounded-[1.5rem] bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : 'Usar este alias'}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="rounded-[1.5rem] border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Ahora no
            </button>
          </div>
        </form>

        <p className="mt-4 text-xs text-slate-500">
          Si preferís no elegir ahora, vas a seguir apareciendo con el nombre que te asignamos
          automáticamente y te lo vamos a volver a preguntar la próxima vez.
        </p>
      </div>
    </div>
  )
}

export default AliasPrompt
