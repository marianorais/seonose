/**
 * /anteriores - Archivo de desafíos, en calendarios mensuales.
 *
 * Los datos salen de la misma consulta paginada de siempre
 * (`listarDesafiosAnteriores`): qué días tienen desafío y si este dispositivo
 * ya los jugó. Los meses se cargan solos a medida que se baja, del más reciente
 * al más viejo. El progreso a medias se lee del navegador ("en curso"). Elegir
 * un día abre el flujo de desafío anterior que ya existe.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import PaginaBase, { Portada } from '../components/PaginaBase'
import CalendarioMes from '../components/anteriores/CalendarioMes'
import { Cargando, EstadoVacio, MensajeError } from '../components/Estados'
import { getTodayKey } from '../lib/appHelpers'
import { ARCHIVO_DESDE, claveMes, mesAnterior, mesesEntre, primerDia } from '../lib/calendario'
import type { DiaArchivo } from '../lib/calendario'
import { listarDesafiosAnteriores, progresoLocalAnterior } from '../lib/desafios'
import type { DesafioAnterior } from '../lib/desafios'
import { obtenerPlayerId } from '../lib/playerIdentity'
import { mensajeDeError } from '../lib/rpc'
import type { ErrorRpc, ResultadoRpc } from '../lib/rpc'

interface Cargado {
  fechas: DesafioAnterior[]
  hayMas: boolean
  /** Fecha más vieja cargada: desde ahí sigue la próxima página. */
  cursor: string | null
}

const VACIO: Cargado = { fechas: [], hayMas: true, cursor: null }

/**
 * Pide páginas hasta tener completo el mes `mes` (o hasta que no haya más).
 * Las páginas vienen de la más reciente a la más vieja, así que alcanza con
 * pasar el primer día del mes.
 */
const cargarHasta = async (playerId: string, mes: string, desde: Cargado): Promise<ResultadoRpc<Cargado>> => {
  let { fechas, hayMas, cursor } = desde

  while (hayMas && (cursor === null || cursor >= primerDia(mes))) {
    const respuesta = await listarDesafiosAnteriores(playerId, cursor ?? undefined)

    if (!respuesta.ok) return respuesta

    fechas = [...fechas, ...respuesta.datos.fechas]
    hayMas = respuesta.datos.hayMas && respuesta.datos.fechas.length > 0
    cursor = respuesta.datos.fechas.at(-1)?.fecha ?? cursor
  }

  return { ok: true, datos: { fechas, hayMas, cursor } }
}

type Carga = { estado: 'cargando' } | { estado: 'error'; error: ErrorRpc } | { estado: 'listo' }

function DesafiosAnterioresPage() {
  const hoy = useMemo(() => getTodayKey(), [])
  const playerId = useMemo(() => obtenerPlayerId(), [])
  const primerMesDelArchivo = claveMes(ARCHIVO_DESDE)

  const [cargado, setCargado] = useState<Cargado>(VACIO)
  // Mes más viejo que se muestra. Arranca con el mes actual y el anterior.
  const [hastaMes, setHastaMes] = useState(() => mesAnterior(claveMes(hoy)))
  const [carga, setCarga] = useState<Carga>({ estado: 'cargando' })
  const [cargandoMas, setCargandoMas] = useState(false)
  const [errorMas, setErrorMas] = useState<ErrorRpc | null>(null)
  const [intento, setIntento] = useState(0)
  // Evita pedir el mismo mes dos veces si el scroll dispara seguido.
  const pidiendo = useRef(false)
  // Marca al final de la lista: cuando aparece en pantalla, se carga otro mes.
  const centinela = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let vigente = true

    void cargarHasta(playerId, mesAnterior(claveMes(hoy)), VACIO).then((respuesta) => {
      if (!vigente) return

      if (!respuesta.ok) {
        setCarga({ estado: 'error', error: respuesta.error })
        return
      }

      setCargado(respuesta.datos)
      setCarga({ estado: 'listo' })
    })

    return () => {
      vigente = false
    }
  }, [playerId, hoy, intento])

  const reintentar = useCallback(() => {
    setCarga({ estado: 'cargando' })
    setIntento((valor) => valor + 1)
  }, [])

  const meses = mesesEntre(hoy, hastaMes)
  const quedanMeses = meses[meses.length - 1] > primerMesDelArchivo

  const cargarMesAnterior = useCallback(async () => {
    if (pidiendo.current) return
    pidiendo.current = true

    const objetivo = mesAnterior(hastaMes)

    setCargandoMas(true)

    const respuesta = await cargarHasta(playerId, objetivo, cargado)

    setCargandoMas(false)
    pidiendo.current = false

    if (!respuesta.ok) {
      setErrorMas(respuesta.error)
      return
    }

    setCargado(respuesta.datos)
    setHastaMes(objetivo)
  }, [cargado, hastaMes, playerId])

  // Scroll infinito: cuando el final de la lista se acerca a la pantalla, se
  // carga el mes anterior. Se vuelve a observar después de cada mes, así sigue
  // cargando si todavía queda espacio libre en pantalla.
  useEffect(() => {
    if (carga.estado !== 'listo' || !quedanMeses || errorMas) return

    const nodo = centinela.current

    if (!nodo) return

    // Navegadores sin IntersectionObserver: se cargan todos los meses de corrido.
    if (typeof IntersectionObserver === 'undefined') {
      void Promise.resolve().then(cargarMesAnterior)
      return
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((entrada) => entrada.isIntersecting)) void cargarMesAnterior()
      },
      { rootMargin: '600px 0px' }
    )

    observador.observe(nodo)

    return () => observador.disconnect()
  }, [carga.estado, quedanMeses, errorMas, cargarMesAnterior])

  const archivo = useMemo(
    () => new Map<string, DiaArchivo>(cargado.fechas.map((fila) => [fila.fecha, fila])),
    [cargado.fechas]
  )

  const enCurso = useCallback((fecha: string) => {
    const progreso = progresoLocalAnterior(fecha)
    return Boolean(progreso && !progreso.finished)
  }, [])

  return (
    <PaginaBase>
      <Portada etiqueta="Desafíos" icono="📅" titulo="Desafíos anteriores" />

      <div className="mx-auto mt-5 w-full max-w-lg space-y-4 sm:mt-6 sm:space-y-6">
        {carga.estado === 'cargando' && <Cargando texto="Armando el calendario…" />}

        {carga.estado === 'error' && <MensajeError mensaje={mensajeDeError(carga.error)} onReintentar={reintentar} />}

        {carga.estado === 'listo' && (
          <>
            {cargado.fechas.length === 0 && (
              <EstadoVacio icono="🗓️" titulo="Todavía no hay desafíos anteriores">
                <p>Volvé mañana: el desafío de hoy va a estar acá.</p>
              </EstadoVacio>
            )}

            {meses.map((mes) => (
              <CalendarioMes key={mes} mes={mes} hoy={hoy} archivo={archivo} enCurso={enCurso} />
            ))}

            {errorMas && <MensajeError mensaje={mensajeDeError(errorMas)} onReintentar={() => setErrorMas(null)} />}

            {quedanMeses && !errorMas && (
              <div ref={centinela} aria-live="polite">
                {cargandoMas && <Cargando texto="Cargando más meses…" />}
              </div>
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
