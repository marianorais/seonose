import { useEffect, useState } from 'react'

import AvatarJugador from '../components/AvatarJugador'
import PaginaBase, { Portada } from '../components/PaginaBase'
import { AVATAR_PREDEFINIDOS, AVATAR_PREDETERMINADO } from '../lib/avatarConfig'
import { guardarPerfil, obtenerPerfilDePlayer } from '../lib/aliasHelpers'
import { obtenerPlayerId } from '../lib/playerIdentity'

const MENSAJES_ERROR: Record<string, string> = {
  'alias-invalido': 'El alias debe tener entre 1 y 30 caracteres.',
  'avatar-invalido': 'Elegí uno de los avatares disponibles.',
  duplicado: 'Ese alias ya lo está usando otro jugador. Probá con otro.',
  error: 'No pudimos guardar el perfil. Revisá tu conexión e intentá de nuevo.',
}

function PerfilPage() {
  const [playerId] = useState(obtenerPlayerId)
  const [alias, setAlias] = useState('')
  const [avatar, setAvatar] = useState<string>(AVATAR_PREDETERMINADO)
  const [cargando, setCargando] = useState(true)
  const [perfilCargado, setPerfilCargado] = useState(false)
  const [intentoCarga, setIntentoCarga] = useState(0)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState(false)

  useEffect(() => {
    let vigente = true

    void obtenerPerfilDePlayer(playerId)
      .then((respuesta) => {
        if (!vigente) return

        if (!respuesta.ok) {
          setError(MENSAJES_ERROR.error)
          return
        }

        setAlias(respuesta.perfil.alias ?? '')
        setAvatar(respuesta.perfil.avatar ?? AVATAR_PREDETERMINADO)
        setPerfilCargado(true)
      })
      .catch((exception: unknown) => {
        console.error('No se pudo cargar el perfil:', exception)
        if (vigente) setError(MENSAJES_ERROR.error)
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })

    return () => {
      vigente = false
    }
  }, [intentoCarga, playerId])

  const guardar = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (guardando) return

    const aliasLimpio = alias.trim()
    if (!aliasLimpio || aliasLimpio.length > 30) {
      setError(MENSAJES_ERROR['alias-invalido'])
      setExito(false)
      return
    }

    setGuardando(true)
    setError(null)
    setExito(false)

    try {
      const resultado = await guardarPerfil(playerId, aliasLimpio, avatar)

      if (!resultado.ok) {
        setError(MENSAJES_ERROR[resultado.motivo])
        return
      }

      setAlias(resultado.perfil.alias)
      setAvatar(resultado.perfil.avatar)
      setExito(true)
    } catch (exception) {
      console.error('No se pudo guardar el perfil:', exception)
      setError(MENSAJES_ERROR.error)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <PaginaBase>
      <div className="space-y-5">
        <Portada
          etiqueta="Tu cuenta de jugador"
          icono="👤"
          titulo="Perfil"
          bajada="Elegí cómo querés aparecer en los rankings y en tus salas."
        />

        <section className="card-surface" aria-labelledby="titulo-editar-perfil">
          {cargando ? (
            <p role="status" className="py-8 text-center text-slate-600">Cargando tu perfil…</p>
          ) : !perfilCargado ? (
            <div className="space-y-4 text-center">
              <p role="alert" className="text-sm font-semibold text-red-700">{error ?? MENSAJES_ERROR.error}</p>
              <button
                type="button"
                onClick={() => {
                  setCargando(true)
                  setError(null)
                  setIntentoCarga((valor) => valor + 1)
                }}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Reintentar
              </button>
            </div>
          ) : (
            <form onSubmit={guardar} className="space-y-6">
              <div className="flex flex-col items-center gap-3 rounded-3xl bg-slate-50 px-4 py-6">
                <AvatarJugador avatar={avatar} className="h-20 w-20 text-4xl" />
                <p className="max-w-full truncate text-lg font-bold text-slate-900">
                  {alias.trim() || 'Tu alias'}
                </p>
              </div>

              <div>
                <h2 id="titulo-editar-perfil" className="text-lg font-bold text-slate-900">
                  {alias ? 'Editar alias' : 'Crear tu alias'}
                </h2>
                <label htmlFor="perfil-alias" className="mt-3 block text-sm font-semibold text-slate-700">
                  Alias
                </label>
                <input
                  id="perfil-alias"
                  type="text"
                  value={alias}
                  maxLength={30}
                  autoComplete="nickname"
                  onChange={(event) => {
                    setAlias(event.target.value)
                    setError(null)
                    setExito(false)
                  }}
                  placeholder="Tu alias"
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                />
                <p className="mt-1 text-xs text-slate-500">Hasta 30 caracteres. Se quitarán espacios al principio y al final.</p>
              </div>

              <fieldset>
                <legend className="text-sm font-semibold text-slate-700">Elegí tu avatar</legend>
                <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-7">
                  {AVATAR_PREDEFINIDOS.map((opcion) => (
                    <button
                      key={opcion}
                      type="button"
                      onClick={() => {
                        setAvatar(opcion)
                        setExito(false)
                      }}
                      aria-label={`Elegir avatar ${opcion}`}
                      aria-pressed={avatar === opcion}
                      className={`flex aspect-square min-h-12 items-center justify-center rounded-2xl border text-2xl transition hover:bg-sky-50 ${
                        avatar === opcion
                          ? 'border-sky-500 bg-sky-100 ring-2 ring-sky-200'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      {opcion}
                    </button>
                  ))}
                </div>
              </fieldset>

              {error && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
              {exito && <p role="status" className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">Tu perfil se guardó correctamente.</p>}

              <button
                type="submit"
                disabled={guardando || !alias.trim() || !perfilCargado}
                className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {guardando ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </form>
          )}
        </section>
      </div>
    </PaginaBase>
  )
}

export default PerfilPage
