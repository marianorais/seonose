/**
 * /salas - Crear una sala, unirse a una y ver las propias.
 *
 * Crear es escribir un nombre y tocar un botón. Si el jugador no tiene alias,
 * se le pide en el momento (los demás tienen que saber quién es) y la sala se
 * crea apenas lo elige.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import PaginaBase, { Portada } from '../components/PaginaBase'
import AliasPrompt from '../components/AliasPrompt'
import { Cargando, EstadoVacio, MensajeError } from '../components/Estados'
import { EVENTOS, registrarEvento } from '../lib/analytics'
import { obtenerPlayerId } from '../lib/playerIdentity'
import { mensajeDeError } from '../lib/rpc'
import type { ErrorRpc } from '../lib/rpc'
import {
  LARGO_MAXIMO_NOMBRE_SALA,
  MENSAJES_ESTADO_SALA,
  MENSAJES_NOMBRE_SALA,
  crearSala,
  extraerCodigoSala,
  obtenerMisSalas,
  validarNombreSala,
} from '../lib/salas'
import type { ResumenSala } from '../lib/salas'

const tarjeta = 'rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6'
const campo =
  'w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100'
const botonPrincipal =
  'w-full rounded-2xl bg-slate-900 px-5 py-3.5 text-base font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50'

const CrearSala = ({ playerId }: { playerId: string }) => {
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)
  const [pedirAlias, setPedirAlias] = useState(false)
  const enviando = useRef(false)

  const crear = async () => {
    if (enviando.current) return

    const validacion = validarNombreSala(nombre)

    if (!validacion.ok) {
      setError(MENSAJES_NOMBRE_SALA[validacion.error])
      return
    }

    enviando.current = true
    setCreando(true)
    setError(null)

    const respuesta = await crearSala(playerId, validacion.nombre)

    enviando.current = false
    setCreando(false)

    if (!respuesta.ok) {
      setError(mensajeDeError(respuesta.error))
      return
    }

    if (respuesta.datos.estado === 'sin-alias') {
      setPedirAlias(true)
      return
    }

    if (respuesta.datos.estado !== 'ok') {
      setError(MENSAJES_ESTADO_SALA[respuesta.datos.estado])
      return
    }

    registrarEvento(EVENTOS.salaCreada)
    navigate(`/sala/${respuesta.datos.datos.codigo}?nueva=1`)
  }

  return (
    <section aria-labelledby="titulo-crear" className={tarjeta}>
      <h2 id="titulo-crear" className="text-lg font-bold text-slate-900">
        <span aria-hidden>✨ </span>Creá tu sala
      </h2>
      <p className="mt-1 text-sm text-slate-600">Ponele un nombre y listo. Después compartís el link.</p>

      <form
        className="mt-4 space-y-3"
        onSubmit={(evento) => {
          evento.preventDefault()
          void crear()
        }}
      >
        <div>
          <label htmlFor="nombre-sala" className="sr-only">
            Nombre de la sala
          </label>
          <input
            id="nombre-sala"
            value={nombre}
            maxLength={LARGO_MAXIMO_NOMBRE_SALA}
            placeholder="Ej.: Los del laburo"
            autoComplete="off"
            aria-invalid={Boolean(error)}
            aria-describedby="ayuda-nombre-sala"
            onChange={(evento) => {
              setNombre(evento.target.value)
              setError(null)
            }}
            className={campo}
          />
          <p id="ayuda-nombre-sala" className="mt-1 text-right text-xs text-slate-500">
            {nombre.trim().length}/{LARGO_MAXIMO_NOMBRE_SALA}
          </p>
        </div>

        {error && (
          <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            {error}
          </p>
        )}

        <button type="submit" disabled={creando || nombre.trim() === ''} className={botonPrincipal}>
          {creando ? 'Creando…' : 'Crear sala'}
        </button>
      </form>

      <AliasPrompt
        isOpen={pedirAlias}
        playerId={playerId}
        onClose={() => setPedirAlias(false)}
        onSaved={() => {
          setPedirAlias(false)
          void crear()
        }}
      />
    </section>
  )
}

const UnirmeASala = () => {
  const navigate = useNavigate()
  const [entrada, setEntrada] = useState('')
  const [error, setError] = useState<string | null>(null)

  return (
    <section aria-labelledby="titulo-unirme" className={tarjeta}>
      <h2 id="titulo-unirme" className="text-lg font-bold text-slate-900">
        <span aria-hidden>🔑 </span>Unirme a una sala
      </h2>
      <p className="mt-1 text-sm text-slate-600">Pegá el link que te pasaron (o sólo el código).</p>

      <form
        className="mt-4 space-y-3"
        onSubmit={(evento) => {
          evento.preventDefault()
          const codigo = extraerCodigoSala(entrada)

          if (!codigo) {
            setError('Ese link o código no parece de una sala. Revisá que esté completo.')
            return
          }

          navigate(`/sala/${codigo}`)
        }}
      >
        <label htmlFor="codigo-sala" className="sr-only">
          Link o código de la sala
        </label>
        <input
          id="codigo-sala"
          value={entrada}
          placeholder="seonose.com.ar/sala/…"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={Boolean(error)}
          onChange={(evento) => {
            setEntrada(evento.target.value)
            setError(null)
          }}
          className={campo}
        />

        {error && (
          <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={entrada.trim() === ''}
          className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-base font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Entrar
        </button>
      </form>
    </section>
  )
}

type Carga = { estado: 'cargando' } | { estado: 'error'; error: ErrorRpc } | { estado: 'listo'; salas: ResumenSala[] }

const MisSalas = ({ playerId }: { playerId: string }) => {
  const [carga, setCarga] = useState<Carga>({ estado: 'cargando' })
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let vigente = true

    void obtenerMisSalas(playerId).then((respuesta) => {
      if (!vigente) return
      if (!respuesta.ok) return setCarga({ estado: 'error', error: respuesta.error })
      if (respuesta.datos.estado !== 'ok') return setCarga({ estado: 'error', error: 'servidor' })

      setCarga({ estado: 'listo', salas: respuesta.datos.datos })
    })

    return () => {
      vigente = false
    }
  }, [playerId, intento])

  return (
    <section aria-labelledby="titulo-mis-salas" className="space-y-3">
      <h2 id="titulo-mis-salas" className="px-1 text-lg font-bold text-slate-900">
        Mis salas
      </h2>

      {carga.estado === 'cargando' && <Cargando texto="Buscando tus salas…" />}

      {carga.estado === 'error' && (
        <MensajeError
          mensaje={mensajeDeError(carga.error)}
          onReintentar={() => {
            setCarga({ estado: 'cargando' })
            setIntento((valor) => valor + 1)
          }}
        />
      )}

      {carga.estado === 'listo' && carga.salas.length === 0 && (
        <EstadoVacio icono="👥" titulo="Todavía no estás en ninguna sala">
          <p>Creá una para tu familia, tus amigos o el trabajo, y mandales el link.</p>
        </EstadoVacio>
      )}

      {carga.estado === 'listo' && carga.salas.length > 0 && (
        <ul className="space-y-2">
          {carga.salas.map((sala) => (
            <li key={sala.codigo}>
              <Link
                to={`/sala/${sala.codigo}`}
                className="group flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <span className="text-2xl" aria-hidden>
                  👥
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-slate-900">{sala.nombre}</span>
                  <span className="block text-sm text-slate-600">
                    {sala.integrantes} {sala.integrantes === 1 ? 'integrante' : 'integrantes'}
                    {sala.soyPropietario ? ' · la administrás vos' : ''}
                  </span>
                </span>
                {sala.miPosicion !== null && (
                  <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-900">
                    <span className="sr-only">Tu puesto: </span>
                    {sala.miPosicion}º
                  </span>
                )}
                <span className="shrink-0 text-slate-400 transition group-hover:translate-x-1" aria-hidden>
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function SalasPage() {
  const playerId = useMemo(() => obtenerPlayerId(), [])

  return (
    <PaginaBase>
      <Portada
        etiqueta="Salas"
        icono="👥"
        titulo="Competí con tu grupo"
        bajada="Creá una sala, invitá a tus amigos y descubrí quién sabe más."
      />

      <div className="mt-5 grid gap-4 sm:mt-6 md:grid-cols-2">
        <CrearSala playerId={playerId} />
        <UnirmeASala />
      </div>

      <div className="mt-6">
        <MisSalas playerId={playerId} />
      </div>

      <details className="mt-6 rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700">
        <summary className="cursor-pointer font-semibold">¿Cómo se suman los puntos?</summary>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>Cada respuesta correcta del desafío del día vale 1 punto.</li>
          <li>Cuenta la primera partida de cada día, jugada ese mismo día.</li>
          <li>Los puntos se cuentan desde el día en que se creó la sala.</li>
          <li>Los desafíos anteriores aparecen en la actividad, pero no suman.</li>
          <li>Crear, compartir o entrar a una sala no da puntos: sólo jugar.</li>
        </ul>
      </details>

      <div className="mt-6 text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          ← Volver al desafío de hoy
        </Link>
      </div>
    </PaginaBase>
  )
}

export default SalasPage
