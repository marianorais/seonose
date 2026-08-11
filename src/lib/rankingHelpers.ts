/**
 * Capa de datos y dominio del ranking.
 *
 * Queda separada de la vista (`RankingModal`) a propósito: el componente sólo
 * pinta lo que recibe y todo lo que se puede razonar sin un navegador —rangos
 * de fechas, alias de jugador, criterio de orden— vive acá y es testeable.
 *
 * Cómo se identifica a un jugador: por `game_sessions.playerid`, la identidad
 * estable que vive en el dispositivo (ver `playerIdentity`). Las partidas
 * anteriores a ese esquema quedaron con `playerid = 'ip:<IP>'` mediante el
 * backfill de la migración, así que hay una sola forma de agrupar. El alias sale
 * de `player_aliases`; si no eligió ninguno, se deriva uno estable del hash. La
 * IP nunca sale del cliente hacia la vista: sólo viaja el alias.
 *
 * Reconocer al jugador actual ya no depende de la red: el identificador se lee
 * del dispositivo de forma sincrónica, así que el ranking lo destaca aunque el
 * servicio de IP esté lento o bloqueado.
 */

import { supabase } from './supabase'
import { obtenerMapaIdentidades } from './aliasHelpers'
import {
  ipDeIdLegado,
  idLegadoDeIp,
  obtenerIpsPropias,
  obtenerPlayerId,
  obtenerSesionesPropias,
  registrarSesionPropia,
} from './playerIdentity'
import { cargarEstadoGuardado } from './quizHelpers'
import { getTodayKey } from './appHelpers'

export type RankingPeriod = 'diario' | 'mensual' | 'anual'

export interface RankingEntry {
  /** Clave interna del jugador (hash de la IP), nunca la IP en claro. */
  playerKey: string
  alias: string
  emoji: string
  /** Tono HSL derivado del hash, para el avatar. */
  hue: number
  position: number
  games: number
  correct: number
  total: number
  /** Puntos: 1 por respuesta correcta, 0 por incorrecta. */
  points: number
  /** Exactitud 0-100 con un decimal. */
  accuracy: number
  /** Promedio de segundos por respuesta. `null` si no hay respuestas cargadas. */
  avgResponseTime: number | null
  isCurrentPlayer: boolean
}

/**
 * Datos del período sin ordenar. Se separan del `RankingResult` porque no
 * dependen de la métrica elegida: así cambiar entre "Puntos" y "% de aciertos"
 * reordena lo que ya está en memoria en lugar de volver a pegarle a Supabase.
 */
export interface RankingData {
  /** Jugadores que califican, sin posición asignada todavía. */
  players: RankingEntry[]
  currentPlayerGames: number
  gamesToQualify: number | null
  rangeLabel: string
  minGames: number
  excludedByMinGames: number
}

export interface RankingResult {
  entries: RankingEntry[]
  /** El jugador actual, incluso si quedó fuera del top mostrado. */
  currentPlayer: RankingEntry | null
  /** Rival inmediatamente por encima del jugador actual. `null` si va 1º. */
  playerAbove: RankingEntry | null
  /**
   * Partidas que le faltan al jugador actual para entrar al ranking.
   * `null` si ya califica o si todavía no jugó en el período.
   */
  gamesToQualify: number | null
  /** Partidas jugadas en el período por el jugador actual, califique o no. */
  currentPlayerGames: number
  totalPlayers: number
  rangeLabel: string
  minGames: number
  /** Jugadores que quedaron afuera por no llegar al mínimo de partidas. */
  excludedByMinGames: number
}

/** La app define "el día" en hora de Argentina (ver `getTodayKey`). */
const AR_TIME_ZONE = 'America/Argentina/Buenos_Aires'
/** Argentina no aplica horario de verano desde 2009: el offset es fijo. */
const AR_UTC_OFFSET = '-03:00'

const MAX_SESSIONS = 5000
const MAX_ALIASES = 5000
const ANSWERS_CHUNK_SIZE = 300
export const RANKING_TOP_SIZE = 10

const pad = (value: number) => String(value).padStart(2, '0')

interface DateParts {
  year: number
  month: number
  day: number
}

const obtenerFechaEnArgentina = (reference: Date): DateParts => {
  const formatted = new Intl.DateTimeFormat('en-CA', { timeZone: AR_TIME_ZONE }).format(reference)
  const [year, month, day] = formatted.split('-').map(Number)

  return { year, month, day }
}

/**
 * Normaliza partes fuera de rango usando UTC: `{ month: 13 }` pasa a enero del
 * año siguiente. Necesario porque el rango mensual usa `month + 1`, que en
 * diciembre daría la fecha inválida "2026-13-01".
 */
const normalizarPartes = ({ year, month, day }: DateParts): DateParts => {
  const normalized = new Date(Date.UTC(year, month - 1, day))

  return {
    year: normalized.getUTCFullYear(),
    month: normalized.getUTCMonth() + 1,
    day: normalized.getUTCDate(),
  }
}

export const inicioDeDia = (parts: DateParts) => {
  const { year, month, day } = normalizarPartes(parts)

  return `${year}-${pad(month)}-${pad(day)}T00:00:00${AR_UTC_OFFSET}`
}

/** Suma días usando UTC para que JS normalice fin de mes y año bisiesto. */
const sumarDias = ({ year, month, day }: DateParts, days: number): DateParts =>
  normalizarPartes({ year, month, day: day + days })

const formatearFechaLarga = (parts: DateParts) =>
  new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
  )

const formatearMes = (parts: DateParts) => {
  const label = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(parts.year, parts.month - 1, 1))
  )

  return label.charAt(0).toUpperCase() + label.slice(1)
}

export interface PeriodDefinition {
  id: RankingPeriod
  label: string
  /** Partidas mínimas para entrar al ranking del período. */
  minGames: number
  buildRange: (today: DateParts) => { fromIso: string; toIso: string; rangeLabel: string }
}

/**
 * Un objeto por período con su rango y su mínimo de partidas (Strategy): para
 * agregar "semanal" alcanza con sumar una entrada acá.
 */
export const PERIOD_DEFINITIONS: Record<RankingPeriod, PeriodDefinition> = {
  diario: {
    id: 'diario',
    label: 'Hoy',
    minGames: 1,
    buildRange: (today) => ({
      fromIso: inicioDeDia(today),
      toIso: inicioDeDia(sumarDias(today, 1)),
      rangeLabel: formatearFechaLarga(today),
    }),
  },
  mensual: {
    id: 'mensual',
    label: 'Mes',
    minGames: 3,
    buildRange: (today) => ({
      fromIso: inicioDeDia({ ...today, day: 1 }),
      toIso: inicioDeDia({ year: today.year, month: today.month + 1, day: 1 }),
      rangeLabel: formatearMes(today),
    }),
  },
  anual: {
    id: 'anual',
    label: 'Año',
    minGames: 3,
    buildRange: (today) => ({
      fromIso: inicioDeDia({ year: today.year, month: 1, day: 1 }),
      toIso: inicioDeDia({ year: today.year + 1, month: 1, day: 1 }),
      rangeLabel: String(today.year),
    }),
  },
}

export const PERIOD_ORDER: RankingPeriod[] = ['diario', 'mensual', 'anual']

const ADJETIVOS = [
  'Veloz', 'Sagaz', 'Audaz', 'Feroz', 'Fugaz', 'Tenaz', 'Genial', 'Letal',
  'Colosal', 'Imparable', 'Invencible', 'Implacable', 'Insaciable', 'Formidable',
  'Temible', 'Ágil', 'Sutil', 'Brutal', 'Estelar', 'Radiante',
]

// Adjetivos invariables en género a propósito, para que combinen con cualquier
// animal sin errores de concordancia ("Lechuza Veloz", "Zorro Veloz").
const ANIMALES = [
  { name: 'Zorro', emoji: '🦊' },
  { name: 'Búho', emoji: '🦉' },
  { name: 'Tigre', emoji: '🐯' },
  { name: 'León', emoji: '🦁' },
  { name: 'Lobo', emoji: '🐺' },
  { name: 'Águila', emoji: '🦅' },
  { name: 'Delfín', emoji: '🐬' },
  { name: 'Ballena', emoji: '🐳' },
  { name: 'Pulpo', emoji: '🐙' },
  { name: 'Dragón', emoji: '🐲' },
  { name: 'Unicornio', emoji: '🦄' },
  { name: 'Panda', emoji: '🐼' },
  { name: 'Koala', emoji: '🐨' },
  { name: 'Mono', emoji: '🐵' },
  { name: 'Cebra', emoji: '🦓' },
  { name: 'Camaleón', emoji: '🦎' },
  { name: 'Tiburón', emoji: '🦈' },
  { name: 'Erizo', emoji: '🦔' },
  { name: 'Nutria', emoji: '🦦' },
  { name: 'Ciervo', emoji: '🦌' },
  { name: 'Loro', emoji: '🦜' },
  { name: 'Pingüino', emoji: '🐧' },
  { name: 'Flamenco', emoji: '🦩' },
  { name: 'Rinoceronte', emoji: '🦏' },
]

/** FNV-1a de 32 bits: determinista y suficiente para agrupar y colorear. */
const hashFnv1a = (value: string) => {
  let hash = 0x811c9dc5

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  return hash >>> 0
}

/** Alias, emoji y color estables derivados de la clave del jugador. */
export const construirIdentidad = (playerKey: string) => {
  const hash = hashFnv1a(playerKey)
  const animal = ANIMALES[hash % ANIMALES.length]
  const adjetivo = ADJETIVOS[Math.floor(hash / ANIMALES.length) % ADJETIVOS.length]

  return {
    alias: `${animal.name} ${adjetivo}`,
    emoji: animal.emoji,
    hue: hash % 360,
  }
}

const formatearNumero = (value: number) =>
  value.toLocaleString('es-AR', { maximumFractionDigits: 1 })

const pluralizar = (cantidad: number, singular: string, plural: string) =>
  cantidad === 1 ? singular : plural

/** Desempate final compartido: primero el más rápido, después alfabético. */
const desempatarPorRapidez = (a: RankingEntry, b: RankingEntry) => {
  const tiempoA = a.avgResponseTime ?? Number.POSITIVE_INFINITY
  const tiempoB = b.avgResponseTime ?? Number.POSITIVE_INFINITY

  if (tiempoA !== tiempoB) return tiempoA - tiempoB

  return a.alias.localeCompare(b.alias, 'es')
}

/**
 * Orden por exactitud: primero el porcentaje, después el volumen de puntos y
 * por último la rapidez. Se mantiene tal cual estaba para que el modo
 * "% de aciertos" siga ordenando como antes.
 */
export const compararEntradas = (a: RankingEntry, b: RankingEntry) => {
  if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy
  if (b.points !== a.points) return b.points - a.points

  return desempatarPorRapidez(a, b)
}

/** Orden por puntos; a igual puntaje decide la exactitud y después la rapidez. */
export const compararPorPuntos = (a: RankingEntry, b: RankingEntry) => {
  if (b.points !== a.points) return b.points - a.points
  if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy

  return desempatarPorRapidez(a, b)
}

export type RankingMetric = 'puntos' | 'porcentaje'

export interface MetricDefinition {
  id: RankingMetric
  label: string
  /** Valor visible del jugador, ya formateado. Es lo único que se muestra. */
  formatear: (entry: RankingEntry) => string
  compare: (a: RankingEntry, b: RankingEntry) => number
  /** Ancho 0-100 de la barra, relativo al líder. */
  progreso: (entry: RankingEntry, leader: RankingEntry) => number
  /** Qué le falta al jugador para alcanzar al de arriba. */
  mensajeProgreso: (current: RankingEntry, above: RankingEntry) => string
  /** Explicación del criterio, para el pie de la tabla. */
  criterio: string
}

/**
 * Una definición por métrica (Strategy), igual que `PERIOD_DEFINITIONS`: cada
 * una sabe cómo ordenar, cómo mostrarse y cómo redactar el mensaje de progreso.
 * Agregar una métrica nueva es sumar una entrada acá.
 */
export const METRIC_DEFINITIONS: Record<RankingMetric, MetricDefinition> = {
  puntos: {
    id: 'puntos',
    label: 'Puntos',
    formatear: (entry) => `${entry.points} ${pluralizar(entry.points, 'pt', 'pts')}`,
    compare: compararPorPuntos,
    progreso: (entry, leader) => (leader.points > 0 ? (entry.points / leader.points) * 100 : 0),
    mensajeProgreso: (current, above) => {
      const faltantes = above.points - current.points

      if (faltantes > 0) {
        return `⬆️ Te ${pluralizar(faltantes, 'falta', 'faltan')} ${faltantes} ${pluralizar(faltantes, 'punto', 'puntos')} para alcanzar a ${above.alias} en el puesto #${above.position}.`
      }

      // Mismo puntaje: lo que decide es la exactitud y, si también empata, el tiempo.
      if (above.accuracy > current.accuracy) {
        return `⬆️ Empatás en puntos con ${above.alias}: mejorá tu porcentaje de aciertos para subir al puesto #${above.position}.`
      }

      return `⬆️ Estás a un suspiro de ${above.alias}: superalo respondiendo más rápido para subir al puesto #${above.position}.`
    },
    criterio: 'Se ordena por puntos: 1 por cada respuesta correcta. A igual puntaje, gana quien tiene mejor porcentaje de aciertos.',
  },
  porcentaje: {
    id: 'porcentaje',
    label: '% de aciertos',
    formatear: (entry) => `${formatearNumero(entry.accuracy)}%`,
    compare: compararEntradas,
    progreso: (entry) => entry.accuracy,
    mensajeProgreso: (current, above) => {
      const diferencia = Math.round((above.accuracy - current.accuracy) * 10) / 10

      if (diferencia > 0) {
        return `⬆️ Te falta ${formatearNumero(diferencia)}% para alcanzar a ${above.alias} en el puesto #${above.position}.`
      }

      if (above.points > current.points) {
        const faltantes = above.points - current.points

        return `⬆️ Empatás en porcentaje con ${above.alias}: te ${pluralizar(faltantes, 'falta', 'faltan')} ${faltantes} ${pluralizar(faltantes, 'punto', 'puntos')} para subir al puesto #${above.position}.`
      }

      return `⬆️ Estás a un suspiro de ${above.alias}: superalo respondiendo más rápido para subir al puesto #${above.position}.`
    },
    criterio: 'Se ordena por porcentaje de aciertos sobre las preguntas respondidas. A igual porcentaje, gana quien sumó más puntos.',
  },
}

export const METRIC_ORDER: RankingMetric[] = ['puntos', 'porcentaje']

/** Métrica por defecto del ranking. */
export const DEFAULT_METRIC: RankingMetric = 'puntos'

/** Mensaje del bloque "Tu posición", según la métrica activa. */
export const construirMensajeProgreso = (
  current: RankingEntry,
  above: RankingEntry | null,
  metric: RankingMetric
) => {
  if (!above) return '🏆 Nadie te supera. Volvé mañana para defender el primer puesto.'

  return METRIC_DEFINITIONS[metric].mensajeProgreso(current, above)
}

const dividirEnLotes = <T,>(items: T[], size: number) => {
  const batches: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size))
  }

  return batches
}

interface SessionRow {
  id: number
  correctanswers: number | null
  totalquestions: number | null
  userip: string | null
  playerid: string | null
}

interface PlayerAccumulator {
  playerKey: string
  games: number
  correct: number
  total: number
  timeSum: number
  timeCount: number
}

const COLUMNAS_SESION = 'id,correctanswers,totalquestions,userip,playerid'
const COLUMNAS_SESION_LEGADO = 'id,correctanswers,totalquestions,userip'

/**
 * Sesiones del rango. Si `playerid` todavía no existe en la base (migración sin
 * correr), reintenta con las columnas de siempre y agrupa por IP como antes: el
 * ranking sigue andando en lugar de romperse entero.
 */
const obtenerSesionesDelRango = async (fromIso: string, toIso: string): Promise<SessionRow[]> => {
  const consultar = (columnas: string) =>
    supabase
      .from('game_sessions')
      .select(columnas)
      .gte('completedat', fromIso)
      .lt('completedat', toIso)
      .limit(MAX_SESSIONS)

  const { data, error } = await consultar(COLUMNAS_SESION)

  if (!error) return (data ?? []) as unknown as SessionRow[]

  console.warn('Leyendo game_sessions sin playerid:', error.message)

  const { data: legado, error: errorLegado } = await consultar(COLUMNAS_SESION_LEGADO)

  if (errorLegado) throw new Error(errorLegado.message)

  return ((legado ?? []) as unknown as Omit<SessionRow, 'playerid'>[]).map((row) => ({
    ...row,
    playerid: null,
  }))
}

/** Guarda el día cuya partida ya se reclamó, para no repetir el trabajo. */
const CLAVE_RECLAMO_HECHO = 'seonose-reclamo-dia'

interface RespuestaLocal {
  questionId: number
  userAnswer: string
  responseTime: number
}

/** Huella de una partida: qué se contestó a cada pregunta y en cuánto tiempo. */
const construirHuella = (partes: { pregunta: unknown; respuesta: unknown; tiempo: unknown }[]) =>
  partes
    .map(({ pregunta, respuesta, tiempo }) => `${pregunta}|${respuesta}|${tiempo}`)
    .sort()
    .join('#')

/**
 * Recupera la partida de hoy cuando quedó guardada sin la identidad actual.
 *
 * Hace falta para las partidas jugadas antes de que existiera el identificador
 * estable: quedaron atadas a la IP del momento y, en móvil, esa IP ya rotó, así
 * que no hay forma de reconocerlas por ahí. La partida sí está en la base, y el
 * dispositivo guarda en `localStorage` las respuestas exactas que dio con sus
 * tiempos: eso alcanza para identificarla sin ambigüedad.
 *
 * Se exige coincidencia exacta de todas las respuestas y que haya un único
 * candidato; ante cualquier duda no se reclama nada. Corre una vez por día y se
 * apaga sola en cuanto encuentra la partida.
 */
const reclamarPartidaDeHoy = async (fromIso: string, toIso: string) => {
  const dayKey = getTodayKey()

  const marcarHecho = () => {
    try {
      window.localStorage.setItem(CLAVE_RECLAMO_HECHO, dayKey)
    } catch {
      // Ignore storage errors
    }
  }

  try {
    if (window.localStorage.getItem(CLAVE_RECLAMO_HECHO) === dayKey) return
  } catch {
    // Sin storage no se puede recordar el reclamo; se intenta igual.
  }

  const estado = cargarEstadoGuardado<{ answers?: RespuestaLocal[]; finished?: boolean }>(dayKey)
  const respuestas = estado?.answers

  // Sólo tiene sentido si la partida del día está terminada.
  if (!estado?.finished || !respuestas?.length) return

  const huellaLocal = construirHuella(
    respuestas.map((r) => ({ pregunta: r.questionId, respuesta: r.userAnswer, tiempo: r.responseTime }))
  )

  const { data: candidatas, error } = await supabase
    .from('game_sessions')
    .select('id')
    .gte('completedat', fromIso)
    .lt('completedat', toIso)
    .eq('totalquestions', respuestas.length)
    .limit(MAX_SESSIONS)

  if (error || !candidatas?.length) return

  const ids = (candidatas as { id: number }[]).map((fila) => fila.id)
  const propias = new Set(obtenerSesionesPropias())

  // Si alguna de las candidatas ya está reconocida, no hay nada que reclamar.
  if (ids.some((id) => propias.has(id))) {
    marcarHecho()
    return
  }

  const { data: respuestasRemotas, error: errorRespuestas } = await supabase
    .from('game_answers')
    .select('gamesessionid,questionid,selectedanswer,responsetime')
    .in('gamesessionid', ids)

  if (errorRespuestas || !respuestasRemotas) return

  const porSesion = new Map<number, { pregunta: unknown; respuesta: unknown; tiempo: unknown }[]>()

  for (const fila of respuestasRemotas as Record<string, unknown>[]) {
    const sessionId = Number(fila.gamesessionid)

    if (!Number.isFinite(sessionId)) continue

    const lista = porSesion.get(sessionId) ?? []

    lista.push({ pregunta: fila.questionid, respuesta: fila.selectedanswer, tiempo: fila.responsetime })
    porSesion.set(sessionId, lista)
  }

  const coincidencias = [...porSesion.entries()].filter(
    ([, partes]) => partes.length === respuestas.length && construirHuella(partes) === huellaLocal
  )

  // Una única coincidencia exacta: es la partida de este dispositivo.
  if (coincidencias.length !== 1) return

  registrarSesionPropia(coincidencias[0][0])
  marcarHecho()
}

/** Suma el tiempo de respuesta por sesión, en lotes para no armar URLs enormes. */
const obtenerTiemposPorSesion = async (sessionIds: number[]) => {
  const times = new Map<number, { sum: number; count: number }>()

  const batches = await Promise.all(
    dividirEnLotes(sessionIds, ANSWERS_CHUNK_SIZE).map(async (batch) => {
      const { data, error } = await supabase
        .from('game_answers')
        .select('gamesessionid,responsetime')
        .in('gamesessionid', batch)

      if (error) throw new Error(error.message)

      return data ?? []
    })
  )

  for (const row of batches.flat()) {
    const sessionId = row.gamesessionid as number
    const responseTime = Number(row.responsetime)

    if (!Number.isFinite(responseTime)) continue

    const current = times.get(sessionId) ?? { sum: 0, count: 0 }
    current.sum += responseTime
    current.count += 1
    times.set(sessionId, current)
  }

  return times
}

/**
 * Trae y agrega las partidas del período. Agrega por jugador (no por partida),
 * así quien juega varias veces en el día aparece una sola vez.
 *
 * No ordena ni asigna posiciones: de eso se encarga `construirRanking`, que es
 * puro y depende de la métrica elegida.
 */
export const obtenerRanking = async (period: RankingPeriod): Promise<RankingData> => {
  const definition = PERIOD_DEFINITIONS[period]
  const { fromIso, toIso, rangeLabel } = definition.buildRange(obtenerFechaEnArgentina(new Date()))

  // Antes de armar la tabla se intenta recuperar la partida de hoy si quedó
  // guardada sin la identidad actual. Falla en silencio: si no se puede, el
  // ranking se arma igual.
  try {
    await reclamarPartidaDeHoy(fromIso, toIso)
  } catch (error) {
    console.warn('No se pudo revisar la partida de hoy:', error)
  }

  const [rows, mapa] = await Promise.all([
    obtenerSesionesDelRango(fromIso, toIso),
    obtenerMapaIdentidades(MAX_ALIASES),
  ])

  const aliasPorPersona = mapa.aliasPorGrupo

  /**
   * Identidad de dispositivo -> persona. Agrupar por persona es lo que hace que
   * el mismo usuario en varios dispositivos sea UNA fila del ranking en lugar de
   * competir consigo mismo. Las identidades sin grupo registrado se agrupan por
   * sí mismas (jugadores anónimos).
   */
  const resolverPersona = (identidad: string) =>
    mapa.grupoPorIdentidad.get(identidad) ?? identidad

  // Identidad propia: todo se lee del dispositivo, sin red.
  const playerIdActual = obtenerPlayerId()
  const personaActual = resolverPersona(playerIdActual)
  const misSesiones = new Set(obtenerSesionesPropias())
  const misIps = new Set(obtenerIpsPropias())

  /**
   * Una partida es propia si el dispositivo anotó su id al guardarla, si trae la
   * identidad actual, o si se guardó desde una IP que este dispositivo usó. Lo
   * primero es exacto y no depende de la IP ni de que la migración esté corrida:
   * es lo que hace que el ranking no pierda partidas en móvil, donde la IP rota
   * entre una carga de página y la siguiente.
   */
  const esSesionPropia = (row: SessionRow) =>
    misSesiones.has(row.id) ||
    (row.playerid !== null && row.playerid === playerIdActual) ||
    (row.userip !== null && misIps.has(row.userip))

  // Una partida cuenta si se la puede atribuir a alguien: por identidad, por IP,
  // o porque este dispositivo la reconoce como suya.
  const playableRows = rows.filter(
    (row) => (row.playerid || row.userip || misSesiones.has(row.id)) && (row.totalquestions ?? 0) > 0
  )

  const emptyData: RankingData = {
    players: [],
    currentPlayerGames: 0,
    gamesToQualify: null,
    rangeLabel,
    minGames: definition.minGames,
    excludedByMinGames: 0,
  }

  if (playableRows.length === 0) return emptyData

  const times = await obtenerTiemposPorSesion(playableRows.map((row) => row.id))

  // La persona es la clave del jugador: todas sus partidas del período caen en la
  // misma fila del ranking, en cuantos dispositivos las haya jugado.
  const esJugadorActual = (playerKey: string) => playerKey === personaActual

  const accumulators = new Map<string, PlayerAccumulator>()

  for (const row of playableRows) {
    // Las partidas propias se reagrupan bajo la identidad actual, sin importar
    // con qué clave se guardaron: así todas caen en una sola fila del ranking en
    // lugar de quedar repartidas entre las IPs que fue teniendo el dispositivo.
    // Para el resto, si el backfill no corrió se deriva la clave que habría dejado.
    const identidad = esSesionPropia(row)
      ? playerIdActual
      : row.playerid ?? idLegadoDeIp(row.userip as string)

    // Y de la identidad del dispositivo se pasa a la persona dueña.
    const playerKey = resolverPersona(identidad)

    const accumulator =
      accumulators.get(playerKey) ??
      { playerKey, games: 0, correct: 0, total: 0, timeSum: 0, timeCount: 0 }

    accumulator.games += 1
    accumulator.correct += row.correctanswers ?? 0
    accumulator.total += row.totalquestions ?? 0

    const sessionTime = times.get(row.id)

    if (sessionTime) {
      accumulator.timeSum += sessionTime.sum
      accumulator.timeCount += sessionTime.count
    }

    accumulators.set(playerKey, accumulator)
  }

  const qualified = [...accumulators.values()].filter(
    (accumulator) => accumulator.games >= definition.minGames
  )

  const players = qualified.map((accumulator) => {
    // El alias generado se deriva de la IP en las identidades heredadas, para
    // que los jugadores anónimos de antes conserven el nombre que ya tenían.
    const identity = construirIdentidad(ipDeIdLegado(accumulator.playerKey))
    const aliasElegido = aliasPorPersona.get(accumulator.playerKey)

    return {
      // Hash: `playerKey` termina como `key` en el DOM y no debe filtrar la IP.
      playerKey: `p${hashFnv1a(accumulator.playerKey).toString(36)}`,
      ...identity,
      alias: aliasElegido ?? identity.alias,
      position: 0,
      games: accumulator.games,
      correct: accumulator.correct,
      total: accumulator.total,
      // 1 punto por respuesta correcta, 0 por incorrecta.
      points: accumulator.correct,
      accuracy: Math.round((accumulator.correct / accumulator.total) * 1000) / 10,
      avgResponseTime:
        accumulator.timeCount > 0
          ? Math.round((accumulator.timeSum / accumulator.timeCount) * 10) / 10
          : null,
      isCurrentPlayer: esJugadorActual(accumulator.playerKey),
    } satisfies RankingEntry
  })

  // Se busca sobre todos los acumuladores, no sólo los que calificaron, para
  // poder decirle al jugador cuántas partidas le faltan para entrar.
  const acumuladorActual =
    [...accumulators.values()].find((accumulator) => esJugadorActual(accumulator.playerKey)) ?? null

  const califica = players.some((player) => player.isCurrentPlayer)

  return {
    players,
    currentPlayerGames: acumuladorActual?.games ?? 0,
    gamesToQualify: !califica && acumuladorActual ? definition.minGames - acumuladorActual.games : null,
    rangeLabel,
    minGames: definition.minGames,
    excludedByMinGames: accumulators.size - qualified.length,
  }
}

/**
 * Ordena por la métrica elegida y asigna posiciones. Es puro: alternar entre
 * "Puntos" y "% de aciertos" sólo reordena lo que ya está en memoria.
 */
export const construirRanking = (
  data: RankingData,
  metric: RankingMetric,
  topSize: number = RANKING_TOP_SIZE
): RankingResult => {
  const ranked = [...data.players]
    .sort(METRIC_DEFINITIONS[metric].compare)
    .map((entry, index) => ({ ...entry, position: index + 1 }))

  const currentPlayer = ranked.find((entry) => entry.isCurrentPlayer) ?? null

  return {
    entries: ranked.slice(0, topSize),
    currentPlayer,
    playerAbove: currentPlayer && currentPlayer.position > 1 ? ranked[currentPlayer.position - 2] : null,
    gamesToQualify: data.gamesToQualify,
    currentPlayerGames: data.currentPlayerGames,
    totalPlayers: ranked.length,
    rangeLabel: data.rangeLabel,
    minGames: data.minGames,
    excludedByMinGames: data.excludedByMinGames,
  }
}
