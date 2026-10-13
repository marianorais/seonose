/**
 * /anteriores/:fecha - Jugar el desafío de un día anterior.
 *
 * Usa el mismo `QuizPanel` que el desafío diario. La pantalla deja siempre a
 * la vista qué fecha se está jugando, para que no se confunda con el de hoy.
 * La base guarda el resultado una sola vez por dispositivo y fecha.
 */
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import PaginaBase from '../components/PaginaBase'
import QuizPanel from '../components/QuizPanel'
import { Cargando, EstadoVacio, MensajeError } from '../components/Estados'
import { claveEstadoAnterior, listarDesafiosAnteriores, obtenerDesafioAnterior, progresoLocalAnterior } from '../lib/desafios'
import type { DesafioAnterior, DesafioAnteriorCargado } from '../lib/desafios'
import { esFechaValida, formatearFechaLarga, sumarDias } from '../lib/fechas'
import { obtenerPlayerId } from '../lib/playerIdentity'
import { mensajeDeError } from '../lib/rpc'
import type { ErrorRpc } from '../lib/rpc'

type Carga =
  | { estado: 'cargando' }
  | { estado: 'error'; error: ErrorRpc }
  | { estado: 'no-disponible' }
  | { estado: 'listo'; desafio: DesafioAnteriorCargado; situacion: DesafioAnterior | null }

const VolverALista = () => (
  <div className="mt-6 text-center">
    <Link
      to="/anteriores"
      className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
    >
      ← Ver otros días
    </Link>
  </div>
)

function DesafioAnteriorPage() {
  const { fecha: fechaParam } = useParams()
  const fecha = esFechaValida(fechaParam) ? fechaParam : null

  const [carga, setCarga] = useState<Carga>(() => (fecha ? { estado: 'cargando' } : { estado: 'no-disponible' }))
  const [intento, setIntento] = useState(0)
  // Si hay progreso guardado en este navegador, se retoma directo.
  const [jugando, setJugando] = useState<boolean>(() => Boolean(fecha && progresoLocalAnterior(fecha)))
  const [partidaActiva, setPartidaActiva] = useState(false)

  useEffect(() => {
    if (!fecha) return

    let vigente = true

    void Promise.all([
      obtenerDesafioAnterior(fecha),
      // La lista empieza el día anterior al indicado: la primera fila es esta fecha.
      listarDesafiosAnteriores(obtenerPlayerId(), sumarDias(fecha, 1)),
    ]).then(([desafio, lista]) => {
      if (!vigente) return

      if (!desafio.ok) {
        setCarga({ estado: 'error', error: desafio.error })
        return
      }

      if (!desafio.datos) {
        setCarga({ estado: 'no-disponible' })
        return
      }

      // Si no se pudo saber el estado, se deja jugar: la base igual impide un
      // segundo resultado.
      const situacion = lista.ok ? lista.datos.fechas.find((item) => item.fecha === fecha) ?? null : null

      setCarga({ estado: 'listo', desafio: desafio.datos, situacion })
    })

    return () => {
      vigente = false
    }
  }, [fecha, intento])

  const fechaLarga = fecha ? formatearFechaLarga(fecha) : ''

  if (carga.estado !== 'listo' || !fecha) {
    return (
      <PaginaBase>
        {carga.estado === 'cargando' && <Cargando texto="Cargando el desafío…" />}

        {carga.estado === 'error' && (
          <MensajeError
            mensaje={mensajeDeError(carga.error)}
            onReintentar={() => {
              setCarga({ estado: 'cargando' })
              setIntento((valor) => valor + 1)
            }}
          />
        )}

        {carga.estado === 'no-disponible' && (
          <EstadoVacio icono="🗓️" titulo="Este desafío no está disponible">
            <p>Puede ser el desafío de hoy, uno que todavía no salió o un día que no está en el archivo.</p>
          </EstadoVacio>
        )}

        <VolverALista />
      </PaginaBase>
    )
  }

  const { desafio, situacion } = carga

  if (jugando) {
    return (
      <PaginaBase
        className={partidaActiva ? 'app-jugando' : 'min-h-screen'}
        mainClassName={`mx-auto flex w-full max-w-3xl flex-col items-center justify-start px-4 lg:px-8 ${
          partidaActiva ? 'main-jugando py-2' : 'py-5'
        }`}
      >
        <div className={partidaActiva ? 'flex w-full min-h-0 flex-1 flex-col' : 'w-full space-y-4'}>
          {/* Recordatorio permanente de qué día se está jugando. */}
          <p
            className={`flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-amber-100 px-3 py-1.5 text-center text-sm font-semibold text-amber-900 ${
              partidaActiva ? 'mb-2' : ''
            }`}
          >
            <span aria-hidden>📅</span>
            <span>
              Desafío anterior · <span className="capitalize">{fechaLarga}</span>
            </span>
          </p>

          <QuizPanel
            onPartidaActivaChange={setPartidaActiva}
            questions={desafio.preguntas}
            settings={{ questionsPerDay: desafio.preguntas.length, secondsPerQuestion: desafio.segundosPorPregunta }}
            questionDate={desafio.fecha}
            allowReplay={false}
            esAnterior
            numeroDesafio={desafio.numero}
            claveEstado={claveEstadoAnterior(desafio.fecha)}
          />
        </div>
      </PaginaBase>
    )
  }

  if (situacion?.jugada) {
    return (
      <PaginaBase>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">
            Desafío #{desafio.numero} · <span className="capitalize">{fechaLarga}</span>
          </p>
          <p className="mt-4 text-5xl font-bold tabular-nums text-slate-900">
            {situacion.correctas}/{situacion.total}
          </p>
          <p className="mt-1 text-slate-600">correctas</p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-semibold text-emerald-800">
            <span aria-hidden>✓</span>
            {situacion.jugadaEnVivo ? 'Lo jugaste ese mismo día' : 'Ya jugaste este desafío'}
          </p>
          <p className="mt-4 text-sm text-slate-600">Cada desafío se juega una sola vez desde este dispositivo.</p>
        </div>
        <VolverALista />
      </PaginaBase>
    )
  }

  return (
    <PaginaBase>
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-amber-50 via-white to-sky-50 p-6 text-center shadow-sm ring-1 ring-slate-200 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-700">Desafío anterior</p>
        <h1 className="mt-2 text-3xl font-bold capitalize text-slate-900 sm:text-4xl">{fechaLarga}</h1>
        <p className="mt-2 text-slate-600">
          Desafío #{desafio.numero} · {desafio.preguntas.length} preguntas · {desafio.segundosPorPregunta} segundos por
          pregunta
        </p>

        <ul className="mx-auto mt-6 max-w-md space-y-2 text-left text-sm text-slate-700">
          <li className="flex gap-2">
            <span aria-hidden>☝️</span>
            <span>Se juega una sola vez desde este dispositivo.</span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden>🏆</span>
            <span>Suma a los rankings de ese día, de su mes y de su año, y a tus salas creadas hasta esa fecha.</span>
          </li>
        </ul>

        <button
          type="button"
          onClick={() => setJugando(true)}
          className="mt-6 w-full max-w-xs rounded-2xl bg-slate-900 px-6 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-slate-700"
        >
          Empezar
        </button>
      </div>

      <VolverALista />
    </PaginaBase>
  )
}

export default DesafioAnteriorPage
