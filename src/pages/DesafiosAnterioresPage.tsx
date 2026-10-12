/**
 * /anteriores - Desafíos de días anteriores que todavía se pueden jugar.
 *
 * Si este dispositivo ya jugó una fecha lo dice la base; si una partida quedó
 * a medias en este navegador, se ofrece continuarla.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import PaginaBase, { Portada } from '../components/PaginaBase'
import { Cargando, EstadoVacio, MensajeError } from '../components/Estados'
import { listarDesafiosAnteriores, progresoLocalAnterior } from '../lib/desafios'
import type { DesafioAnterior } from '../lib/desafios'
import { formatearFechaLarga } from '../lib/fechas'
import { obtenerPlayerId } from '../lib/playerIdentity'
import { mensajeDeError } from '../lib/rpc'
import type { ErrorRpc } from '../lib/rpc'

type Carga = { estado: 'cargando' } | { estado: 'error'; error: ErrorRpc } | { estado: 'listo' }

const ChipEstado = ({ desafio, enCursoLocal }: { desafio: DesafioAnterior; enCursoLocal: boolean }) => {
  if (desafio.jugada) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
        <span aria-hidden>✓</span>
        {desafio.jugadaEnVivo ? 'Lo jugaste ese día' : 'Completado'}
      </span>
    )
  }

  if (enCursoLocal) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
        <span aria-hidden>⏳</span>
        En curso
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-900">
      <span aria-hidden>●</span>
      Disponible
    </span>
  )
}

const FilaDesafio = ({ desafio }: { desafio: DesafioAnterior }) => {
  const progreso = progresoLocalAnterior(desafio.fecha)
  const enCursoLocal = Boolean(progreso && !progreso.finished)
  const completado = desafio.jugada
  const fechaLarga = formatearFechaLarga(desafio.fecha)

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:flex-nowrap sm:px-5">
      <div className="min-w-0 flex-1">
        <p className="text-base font-bold capitalize text-slate-900 sm:text-lg">{fechaLarga}</p>
        <p className="mt-0.5 text-sm text-slate-600">
          Desafío #{desafio.numero}
        </p>
        <div className="mt-2">
          <ChipEstado desafio={desafio} enCursoLocal={enCursoLocal} />
        </div>
      </div>

      {completado ? (
        <p className="shrink-0 text-right">
          <span className="block text-2xl font-bold tabular-nums text-slate-900">
            {desafio.correctas}/{desafio.total}
          </span>
          <span className="block text-xs text-slate-500">correctas</span>
        </p>
      ) : (
        <Link
          to={`/anteriores/${desafio.fecha}`}
          aria-label={`${enCursoLocal ? 'Continuar' : 'Jugar'} el desafío del ${fechaLarga}`}
          className="w-full shrink-0 rounded-2xl bg-slate-900 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-700 sm:w-auto"
        >
          {enCursoLocal ? 'Continuar' : 'Jugar'}
        </Link>
      )}
    </li>
  )
}

function DesafiosAnterioresPage() {
  const [desafios, setDesafios] = useState<DesafioAnterior[]>([])
  const [hayMas, setHayMas] = useState(false)
  const [carga, setCarga] = useState<Carga>({ estado: 'cargando' })
  const [cargandoMas, setCargandoMas] = useState(false)
  const [errorMas, setErrorMas] = useState<ErrorRpc | null>(null)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let vigente = true

    void listarDesafiosAnteriores(obtenerPlayerId()).then((respuesta) => {
      if (!vigente) return

      if (!respuesta.ok) {
        setCarga({ estado: 'error', error: respuesta.error })
        return
      }

      setDesafios(respuesta.datos.fechas)
      setHayMas(respuesta.datos.hayMas)
      setCarga({ estado: 'listo' })
    })

    return () => {
      vigente = false
    }
  }, [intento])

  const reintentar = useCallback(() => {
    setCarga({ estado: 'cargando' })
    setIntento((valor) => valor + 1)
  }, [])

  const cargarMas = async () => {
    const ultima = desafios[desafios.length - 1]

    if (!ultima || cargandoMas) return

    setCargandoMas(true)
    setErrorMas(null)

    const respuesta = await listarDesafiosAnteriores(obtenerPlayerId(), ultima.fecha)

    setCargandoMas(false)

    if (!respuesta.ok) {
      setErrorMas(respuesta.error)
      return
    }

    setDesafios((actuales) => [...actuales, ...respuesta.datos.fechas])
    setHayMas(respuesta.datos.hayMas)
  }

  const pendientes = desafios.filter((desafio) => !desafio.jugada).length

  return (
    <PaginaBase>
      <Portada
        etiqueta="Desafíos anteriores"
        icono="📅"
        titulo="¿Te perdiste algún día?"
        bajada="Todavía podés jugarlo. Cada día se juega una sola vez desde este dispositivo y suma al ranking del mes y del año."
      />

      <div className="mt-5 space-y-3 sm:mt-6">
        {carga.estado === 'cargando' && <Cargando texto="Buscando desafíos anteriores…" />}

        {carga.estado === 'error' && (
          <MensajeError mensaje={mensajeDeError(carga.error)} onReintentar={reintentar} />
        )}

        {carga.estado === 'listo' && desafios.length === 0 && (
          <EstadoVacio icono="🗓️" titulo="Todavía no hay desafíos anteriores">
            <p>Volvé mañana: el desafío de hoy va a estar acá.</p>
          </EstadoVacio>
        )}

        {carga.estado === 'listo' && desafios.length > 0 && (
          <>
            {pendientes > 0 && (
              <p className="px-1 text-sm text-slate-600" aria-live="polite">
                {pendientes === 1 ? 'Tenés 1 desafío para jugar' : `Tenés ${pendientes} desafíos para jugar`}
                {hayMas ? ' en esta lista (y hay más días).' : '.'}
              </p>
            )}

            <ul className="space-y-3">
              {desafios.map((desafio) => (
                <FilaDesafio key={desafio.fecha} desafio={desafio} />
              ))}
            </ul>

            {errorMas && <MensajeError mensaje={mensajeDeError(errorMas)} />}

            {hayMas && (
              <button
                type="button"
                onClick={() => void cargarMas()}
                disabled={cargandoMas}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {cargandoMas ? 'Cargando…' : 'Ver días más viejos'}
              </button>
            )}
          </>
        )}
      </div>

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

export default DesafiosAnterioresPage
