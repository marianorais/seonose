import { useEffect, useState } from 'react'

import AvatarJugador from '../components/AvatarJugador'
import PaginaBase, { Portada } from '../components/PaginaBase'
import { AVATAR_PREDEFINIDOS, AVATAR_PREDETERMINADO } from '../lib/avatarConfig'
import { guardarPerfil, obtenerPerfilDePlayer } from '../lib/aliasHelpers'
import { obtenerPlayerId } from '../lib/playerIdentity'
import { obtenerTrofeosJugador } from '../lib/trofeos'
import type { TrofeoJugador } from '../lib/trofeos'
import { formatearFechaCorta } from '../lib/fechas'
import { mensajeDeError } from '../lib/rpc'

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
  const [trofeos, setTrofeos] = useState<TrofeoJugador[]>([])
  const [estadoTrofeos, setEstadoTrofeos] = useState<'cargando' | 'listo' | 'error'>('cargando')
  const [errorTrofeos, setErrorTrofeos] = useState<string | null>(null)
  const [intentoTrofeos, setIntentoTrofeos] = useState(0)

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

  useEffect(() => {
    let vigente = true

    void obtenerTrofeosJugador(playerId)
      .then((respuesta) => {
        if (!vigente) return
        if (!respuesta.ok) {
          setErrorTrofeos(mensajeDeError(respuesta.error))
          setEstadoTrofeos('error')
          return
        }
        setTrofeos(respuesta.datos)
        setEstadoTrofeos('listo')
      })
      .catch((exception: unknown) => {
        console.error('No se pudo cargar el palmarés:', exception)
        if (vigente) {
          setErrorTrofeos('No pudimos cargar tus trofeos. Probá de nuevo en un momento.')
          setEstadoTrofeos('error')
        }
      })

    return () => {
      vigente = false
    }
  }, [intentoTrofeos, playerId])

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

        <section className="card-surface space-y-4" aria-labelledby="titulo-palmares">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Tus victorias</p>
            <h2 id="titulo-palmares" className="mt-1 text-xl font-bold text-slate-900">Palmarés</h2>
          </div>

          {estadoTrofeos === 'cargando' ? (
            <p role="status" className="py-4 text-center text-sm text-slate-600">Cargando tus trofeos…</p>
          ) : estadoTrofeos === 'error' ? (
            <div className="space-y-3 text-center">
              <p role="alert" className="text-sm font-semibold text-red-700">{errorTrofeos}</p>
              <button
                type="button"
                onClick={() => {
                  setEstadoTrofeos('cargando')
                  setErrorTrofeos(null)
                  setIntentoTrofeos((intento) => intento + 1)
                }}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Reintentar
              </button>
            </div>
          ) : trofeos.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-amber-300 bg-amber-50 px-5 py-6 text-center">
              <p className="text-3xl" aria-hidden>🏆</p>
              <p className="mt-2 font-bold text-slate-900">Todavía no hay trofeos</p>
              <p className="mt-1 text-sm text-slate-600">Sumate a una sala o al ranking mensual. Cada competencia es una nueva oportunidad.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-sky-200 bg-sky-50 p-4">
                <h3 className="font-bold text-sky-950">🏆 Copas de sala</h3>
                {trofeos.filter((trofeo) => trofeo.tipo === 'sala').length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {trofeos.filter((trofeo) => trofeo.tipo === 'sala').map((trofeo) => (
                      <li key={`${trofeo.salaId}-${trofeo.empiezaEn}`} className="rounded-2xl bg-white p-3">
                        <p className="font-semibold text-slate-900">{trofeo.salaNombre ?? 'Sala'}</p>
                        <p className="mt-1 text-xs text-slate-600">
                          {formatearFechaCorta(trofeo.empiezaEn.slice(0, 10))} – {formatearFechaCorta(trofeo.terminaEn.slice(0, 10))}
                          {' · '}{trofeo.puntaje} {trofeo.puntaje === 1 ? 'punto' : 'puntos'}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-2 text-sm text-slate-600">Todavía no ganaste copas de sala.</p>}
              </div>

              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
                <h3 className="font-bold text-amber-950">🌟 Copas mensuales globales</h3>
                {trofeos.filter((trofeo) => trofeo.tipo === 'mensual').length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {trofeos.filter((trofeo) => trofeo.tipo === 'mensual').map((trofeo) => {
                      const mes = trofeo.mes ? new Date(`${trofeo.mes}-01T00:00:00Z`) : new Date(trofeo.empiezaEn)
                      const mesEtiqueta = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(mes)
                      return (
                        <li key={`${trofeo.mes}-${trofeo.empiezaEn}`} className="rounded-2xl bg-white p-3">
                          <p className="font-semibold capitalize text-slate-900">{mesEtiqueta}</p>
                          <p className="mt-1 text-xs text-slate-600">
                            Campeón mensual global · {trofeo.puntaje} {trofeo.puntaje === 1 ? 'punto' : 'puntos'}
                          </p>
                        </li>
                      )
                    })}
                  </ul>
                ) : <p className="mt-2 text-sm text-slate-600">Todavía no ganaste copas mensuales.</p>}
              </div>
            </div>
          )}
        </section>
      </div>
    </PaginaBase>
  )
}

export default PerfilPage
