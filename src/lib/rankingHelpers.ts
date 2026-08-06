/**
 * Capa de datos y dominio del ranking.
 *
 * Queda separada de la vista (`RankingModal`) a propósito: el componente sólo
 * pinta lo que recibe y todo lo que se puede razonar sin un navegador —rangos
 * de fechas, alias de jugador, criterio de orden— vive acá y es testeable.
 *
 * Cómo se identifica a un jugador: la base no guarda ningún nombre, sólo
 * `userip` + `useragent`. Se deriva un alias estable de esos dos datos, así el
 * ranking funciona con las partidas ya existentes y sin exponer la IP (nunca
 * sale del cliente hacia la vista).
 */

import { supabase } from './supabase'
import { getClientInfo } from './userSession'

export type RankingPeriod = 'diario' | 'mensual' | 'anual'

export interface RankingEntry {
  /** Clave interna del jugador (hash), nunca la IP. */
  playerKey: string
  alias: string
  /** Sufijo corto para distinguir alias repetidos. */
  code: string
  emoji: string
  /** Tono HSL derivado del hash, para el avatar. */
  hue: number
  position: number
  games: number
  correct: number
  total: number
  /** Exactitud 0-100 con un decimal. */
  accuracy: number
  /** Promedio de segundos por respuesta. `null` si no hay respuestas cargadas. */
  avgResponseTime: number | null
  isCurrentPlayer: boolean
}

export interface RankingResult {
  entries: RankingEntry[]
  /** El jugador actual, incluso si quedó fuera del top mostrado. */
  currentPlayer: RankingEntry | null
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

interface PeriodDefinition {
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

/**
 * Familia de dispositivo en lugar del user agent completo: así el alias no
 * cambia cuando el navegador se actualiza de versión.
 */
export const obtenerFamiliaDispositivo = (userAgent: string) => {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios'
  if (/Android/i.test(userAgent)) return 'android'
  if (/Mobile/i.test(userAgent)) return 'mobile'

  return 'desktop'
}

export const construirClaveJugador = (ip: string, userAgent: string) =>
  `${ip}|${obtenerFamiliaDispositivo(userAgent)}`

/** Alias, emoji y color estables derivados de la clave del jugador. */
export const construirIdentidad = (playerKey: string) => {
  const hash = hashFnv1a(playerKey)
  const animal = ANIMALES[hash % ANIMALES.length]
  const adjetivo = ADJETIVOS[Math.floor(hash / ANIMALES.length) % ADJETIVOS.length]

  return {
    alias: `${animal.name} ${adjetivo}`,
    emoji: animal.emoji,
    code: hash.toString(16).toUpperCase().padStart(8, '0').slice(-4),
    hue: hash % 360,
  }
}

/**
 * Orden del ranking: primero exactitud, después volumen de aciertos y por
 * último rapidez. Se ordena por exactitud y no por aciertos crudos porque la
 * cantidad de preguntas por día cambió con el tiempo (hay partidas de 5, 6 y 8)
 * y comparar aciertos sueltos sería injusto.
 */
export const compararEntradas = (a: RankingEntry, b: RankingEntry) => {
  if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy
  if (b.correct !== a.correct) return b.correct - a.correct

  const tiempoA = a.avgResponseTime ?? Number.POSITIVE_INFINITY
  const tiempoB = b.avgResponseTime ?? Number.POSITIVE_INFINITY

  if (tiempoA !== tiempoB) return tiempoA - tiempoB

  return a.alias.localeCompare(b.alias, 'es')
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
  useragent: string | null
}

interface PlayerAccumulator {
  playerKey: string
  games: number
  correct: number
  total: number
  timeSum: number
  timeCount: number
}

/** Cachea la IP propia: `getClientInfo` pega a un servicio externo. */
let cachedClientKey: string | null | undefined

const obtenerClaveJugadorActual = async () => {
  if (cachedClientKey !== undefined) return cachedClientKey

  try {
    const info = await getClientInfo()
    cachedClientKey = info.ip ? construirClaveJugador(info.ip, info.userAgent) : null
  } catch {
    cachedClientKey = null
  }

  return cachedClientKey
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
 * Arma el ranking del período. Agrega por jugador (no por partida), así quien
 * juega varias veces en el día aparece una sola vez.
 */
export const obtenerRanking = async (
  period: RankingPeriod,
  topSize: number = RANKING_TOP_SIZE
): Promise<RankingResult> => {
  const definition = PERIOD_DEFINITIONS[period]
  const { fromIso, toIso, rangeLabel } = definition.buildRange(obtenerFechaEnArgentina(new Date()))

  const [{ data: sessions, error }, currentKey] = await Promise.all([
    supabase
      .from('game_sessions')
      .select('id,correctanswers,totalquestions,userip,useragent')
      .gte('completedat', fromIso)
      .lt('completedat', toIso)
      .not('userip', 'is', null)
      .limit(MAX_SESSIONS),
    obtenerClaveJugadorActual(),
  ])

  if (error) throw new Error(error.message)

  const rows = (sessions ?? []) as SessionRow[]
  const playableRows = rows.filter((row) => row.userip && (row.totalquestions ?? 0) > 0)

  const emptyResult: RankingResult = {
    entries: [],
    currentPlayer: null,
    totalPlayers: 0,
    rangeLabel,
    minGames: definition.minGames,
    excludedByMinGames: 0,
  }

  if (playableRows.length === 0) return emptyResult

  const times = await obtenerTiemposPorSesion(playableRows.map((row) => row.id))

  const accumulators = new Map<string, PlayerAccumulator>()

  for (const row of playableRows) {
    const playerKey = construirClaveJugador(row.userip as string, row.useragent ?? '')

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

  const ranked = qualified
    .map((accumulator) => {
      const identity = construirIdentidad(accumulator.playerKey)

      return {
        playerKey: accumulator.playerKey,
        ...identity,
        position: 0,
        games: accumulator.games,
        correct: accumulator.correct,
        total: accumulator.total,
        accuracy: Math.round((accumulator.correct / accumulator.total) * 1000) / 10,
        avgResponseTime:
          accumulator.timeCount > 0
            ? Math.round((accumulator.timeSum / accumulator.timeCount) * 10) / 10
            : null,
        isCurrentPlayer: Boolean(currentKey) && accumulator.playerKey === currentKey,
      } satisfies RankingEntry
    })
    .sort(compararEntradas)
    .map((entry, index) => ({ ...entry, position: index + 1 }))

  return {
    entries: ranked.slice(0, topSize),
    currentPlayer: ranked.find((entry) => entry.isCurrentPlayer) ?? null,
    totalPlayers: ranked.length,
    rangeLabel,
    minGames: definition.minGames,
    excludedByMinGames: accumulators.size - qualified.length,
  }
}
