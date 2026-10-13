/**
 * Calendario del archivo de desafíos: armado de meses y estado de cada día.
 *
 * Es lógica pura (sin red ni React) para poder probarla sola. Las fechas viajan
 * como `YYYY-MM-DD` y se calculan en UTC, así nunca se corren de día.
 */
import { numeroDeDesafio } from './fechas'

/** Primer día con desafíos anteriores jugables (mismo valor que en la base). */
export const ARCHIVO_DESDE = '2026-08-05'

/** Encabezado de columnas: la semana empieza el domingo. */
export const DIAS_SEMANA = [
  { corto: 'D', largo: 'domingo' },
  { corto: 'L', largo: 'lunes' },
  { corto: 'M', largo: 'martes' },
  { corto: 'Mi', largo: 'miércoles' },
  { corto: 'J', largo: 'jueves' },
  { corto: 'V', largo: 'viernes' },
  { corto: 'S', largo: 'sábado' },
] as const

const pad = (valor: number) => String(valor).padStart(2, '0')

/** `YYYY-MM` del mes de una fecha. */
export const claveMes = (fecha: string) => fecha.slice(0, 7)

/** Mes anterior a `YYYY-MM`. */
export const mesAnterior = (mes: string) => {
  const [anio, numero] = mes.split('-').map(Number)
  return numero === 1 ? `${anio - 1}-12` : `${anio}-${pad(numero - 1)}`
}

/** Primer día de un mes `YYYY-MM`. */
export const primerDia = (mes: string) => `${mes}-01`

/** "Octubre 2026". */
export const tituloMes = (mes: string) => {
  const [anio, numero] = mes.split('-').map(Number)
  const nombre = new Intl.DateTimeFormat('es-AR', { month: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(anio, numero - 1, 1))
  )

  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${anio}`
}

/**
 * Celdas de un mes: `null` para los huecos antes del día 1 (para que cada día
 * caiga en su columna) y la fecha de cada día. Respeta los años bisiestos.
 */
export const celdasDelMes = (mes: string): (string | null)[] => {
  const [anio, numero] = mes.split('-').map(Number)
  const huecos = new Date(Date.UTC(anio, numero - 1, 1)).getUTCDay()
  const dias = new Date(Date.UTC(anio, numero, 0)).getUTCDate()

  return [
    ...Array.from({ length: huecos }, () => null),
    ...Array.from({ length: dias }, (_, indice) => `${mes}-${pad(indice + 1)}`),
  ]
}

/**
 * Meses a mostrar, del más reciente al más viejo: desde el mes de hoy hasta
 * `hastaMes` inclusive (nunca antes del primer mes del archivo).
 */
export const mesesEntre = (hoy: string, hastaMes: string): string[] => {
  const limite = hastaMes < claveMes(ARCHIVO_DESDE) ? claveMes(ARCHIVO_DESDE) : hastaMes
  const meses: string[] = []

  for (let mes = claveMes(hoy); mes >= limite; mes = mesAnterior(mes)) meses.push(mes)

  return meses
}

export type EstadoDia = 'disponible' | 'completado' | 'en-curso' | 'hoy' | 'futuro' | 'sin-desafio'

export interface DiaArchivo {
  /** Este dispositivo ya lo jugó (ese día o como desafío anterior). */
  jugada: boolean
  jugadaEnVivo: boolean
  correctas: number | null
  total: number | null
}

export interface CeldaDia {
  fecha: string
  dia: number
  estado: EstadoDia
  /** Número del desafío; sólo si ese día hubo desafío (no se inventa para el futuro). */
  numero: number | null
  detalle: DiaArchivo | null
}

/**
 * Estado de un día:
 *  - hoy: el desafío diario (se juega desde el inicio, no desde el archivo);
 *  - futuro: todavía no salió;
 *  - sin-desafío: ya pasó pero no hay un desafío jugable para esa fecha;
 *  - completado / en curso / disponible: según este dispositivo.
 */
export const estadoDelDia = (
  fecha: string,
  hoy: string,
  archivo: ReadonlyMap<string, DiaArchivo>,
  enCurso: (fecha: string) => boolean
): CeldaDia => {
  const dia = Number(fecha.slice(8, 10))

  if (fecha === hoy) return { fecha, dia, estado: 'hoy', numero: numeroDeDesafio(fecha), detalle: null }
  if (fecha > hoy) return { fecha, dia, estado: 'futuro', numero: null, detalle: null }

  const detalle = archivo.get(fecha) ?? null

  if (!detalle) return { fecha, dia, estado: 'sin-desafio', numero: null, detalle: null }

  const estado: EstadoDia = detalle.jugada ? 'completado' : enCurso(fecha) ? 'en-curso' : 'disponible'

  return { fecha, dia, estado, numero: numeroDeDesafio(fecha), detalle }
}
