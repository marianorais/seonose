/**
 * Cálculo de estadísticas para la pantalla /estadisticas.
 * Lee datos ya existentes en Supabase (game_sessions, game_answers,
 * questions) y agrega del lado del cliente. No modifica la base ni
 * escribe nada nuevo.
 *
 * Las lecturas se paginan para no depender del límite por defecto
 * (1000 filas) y que los totales sean exactos.
 */
import { supabase } from './supabase'

const BA_TZ = 'America/Argentina/Buenos_Aires'
const PAGE_SIZE = 1000

const dayKeyOf = (value: string | number | Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: BA_TZ }).format(new Date(value))

interface SessionRow {
  id: number
  startedat: string | null
  completedat: string | null
  totalquestions: number | null
  correctanswers: number | null
  userip: string | null
}

interface AnswerRow {
  gamesessionid: number | null
  questionid: number | null
  iscorrect: boolean | null
  responsetime: number | null
}

export interface PreguntaStat {
  questionid: number
  texto: string
  intentos: number
  porcentaje: number
}

export interface Estadisticas {
  jugadoresUnicos: number
  totalPartidas: number
  partidasHoy: number
  partidasUltimos7: number
  aciertosPromedio: number
  tasaAciertoGlobal: number
  tiempoRespuestaPromedio: number
  totalRespuestas: number
  partidasPorDia: { dia: string; cantidad: number }[]
  distribucionPuntajes: { puntaje: number; cantidad: number }[]
  preguntasDificiles: PreguntaStat[]
  preguntasFaciles: PreguntaStat[]
}

/** Trae todas las filas de una tabla (columnas indicadas) paginando. */
async function fetchAll<T>(table: string, columns: string): Promise<T[]> {
  const rows: T[] = []
  let from = 0

  // Tope de seguridad para evitar bucles infinitos ante respuestas raras.
  for (let page = 0; page < 5000; page += 1) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      console.error(`Error leyendo ${table}:`, error)
      break
    }

    if (!data || data.length === 0) break

    rows.push(...(data as T[]))

    if (data.length < PAGE_SIZE) break

    from += PAGE_SIZE
  }

  return rows
}

const promedio = (valores: number[]) =>
  valores.length === 0 ? 0 : valores.reduce((sum, value) => sum + value, 0) / valores.length

const ultimosDias = (cantidad: number) => {
  const hoy = new Date()
  const dias: string[] = []

  for (let i = cantidad - 1; i >= 0; i -= 1) {
    const fecha = new Date(hoy)
    fecha.setDate(hoy.getDate() - i)
    dias.push(dayKeyOf(fecha))
  }

  // Elimina duplicados (por si un cambio de horario colapsa dos offsets).
  return Array.from(new Set(dias))
}

export const obtenerEstadisticas = async (): Promise<Estadisticas> => {
  const [sessionsRaw, answersRaw, questions] = await Promise.all([
    fetchAll<SessionRow>('game_sessions', 'id, startedat, completedat, totalquestions, correctanswers, userip'),
    fetchAll<AnswerRow>('game_answers', 'gamesessionid, questionid, iscorrect, responsetime'),
    fetchAll<{ id: number; question: string }>('questions', 'id, question'),
  ])

  // Una "partida" es una sesión efectivamente completada. Además se deduplican
  // sesiones repetidas (mismo usuario + mismo completedat), que inflaban el
  // conteo respecto de los completedat realmente distintos en la base.
  const sessionsValidas = new Map<string, SessionRow>()

  for (const session of sessionsRaw) {
    if (!session.completedat) continue
    const key = `${session.userip ?? ''}|${session.completedat}`
    if (!sessionsValidas.has(key)) sessionsValidas.set(key, session)
  }

  const sessions = Array.from(sessionsValidas.values())
  const idsValidos = new Set(sessions.map((session) => session.id))

  // Solo respuestas que pertenecen a una partida válida (descarta duplicados
  // y respuestas de sesiones no completadas).
  const answers = answersRaw.filter(
    (answer) => answer.gamesessionid != null && idsValidos.has(answer.gamesessionid)
  )

  const hoyKey = dayKeyOf(new Date())
  const dias7 = new Set(ultimosDias(7))

  const fechaDePartida = (session: SessionRow) => session.completedat ?? session.startedat

  // ----- Jugadores y partidas -----
  const ipsUnicas = new Set<string>()

  for (const session of sessions) {
    if (session.userip && session.userip !== 'unknown') {
      ipsUnicas.add(session.userip)
    }
  }

  let partidasHoy = 0
  let partidasUltimos7 = 0
  let sumaCorrectas = 0
  let sumaPreguntas = 0

  const partidasPorDiaMap = new Map<string, number>()
  const distribucionMap = new Map<number, number>()

  for (const session of sessions) {
    const fecha = fechaDePartida(session)

    if (fecha) {
      const key = dayKeyOf(fecha)
      partidasPorDiaMap.set(key, (partidasPorDiaMap.get(key) ?? 0) + 1)

      if (key === hoyKey) partidasHoy += 1
      if (dias7.has(key)) partidasUltimos7 += 1
    }

    const correctas = session.correctanswers ?? 0
    const preguntas = session.totalquestions ?? 0

    sumaCorrectas += correctas
    sumaPreguntas += preguntas

    distribucionMap.set(correctas, (distribucionMap.get(correctas) ?? 0) + 1)
  }

  const partidasPorDia = ultimosDias(14).map((dia) => ({
    dia,
    cantidad: partidasPorDiaMap.get(dia) ?? 0,
  }))

  const maxPuntaje = distribucionMap.size > 0 ? Math.max(...distribucionMap.keys()) : 0
  const distribucionPuntajes = Array.from({ length: maxPuntaje + 1 }, (_, puntaje) => ({
    puntaje,
    cantidad: distribucionMap.get(puntaje) ?? 0,
  }))

  // ----- Respuestas / dificultad por pregunta -----
  const textoPorId = new Map<number, string>()
  for (const q of questions) textoPorId.set(q.id, q.question)

  const porPregunta = new Map<number, { total: number; correctas: number }>()
  const tiempos: number[] = []

  for (const answer of answers) {
    if (typeof answer.responsetime === 'number') tiempos.push(answer.responsetime)

    if (answer.questionid == null) continue

    const acc = porPregunta.get(answer.questionid) ?? { total: 0, correctas: 0 }
    acc.total += 1
    if (answer.iscorrect) acc.correctas += 1
    porPregunta.set(answer.questionid, acc)
  }

  const MIN_INTENTOS = 3

  const statsPreguntas: PreguntaStat[] = Array.from(porPregunta.entries())
    .filter(([, valor]) => valor.total >= MIN_INTENTOS)
    .map(([questionid, valor]) => ({
      questionid,
      texto: textoPorId.get(questionid) ?? `Pregunta #${questionid}`,
      intentos: valor.total,
      porcentaje: Math.round((valor.correctas / valor.total) * 100),
    }))

  const preguntasDificiles = [...statsPreguntas]
    .sort((a, b) => a.porcentaje - b.porcentaje)
    .slice(0, 5)

  const preguntasFaciles = [...statsPreguntas]
    .sort((a, b) => b.porcentaje - a.porcentaje)
    .slice(0, 5)

  return {
    jugadoresUnicos: ipsUnicas.size,
    totalPartidas: sessions.length,
    partidasHoy,
    partidasUltimos7,
    aciertosPromedio: Number(promedio(sessions.map((s) => s.correctanswers ?? 0)).toFixed(1)),
    tasaAciertoGlobal: sumaPreguntas > 0 ? Math.round((sumaCorrectas / sumaPreguntas) * 100) : 0,
    tiempoRespuestaPromedio: Number(promedio(tiempos).toFixed(1)),
    totalRespuestas: answers.length,
    partidasPorDia,
    distribucionPuntajes,
    preguntasDificiles,
    preguntasFaciles,
  }
}
