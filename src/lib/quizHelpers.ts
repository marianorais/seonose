/**
 * Utilidades compartidas para el Quiz (helpers de estado, tiempo y normalización).
 * No cambian la lógica de negocio; solo agrupan funciones para mejorar modularidad.
 */

import { getTodayKey } from './appHelpers'
import { INICIO_JUEGO, numeroDeDesafio } from './fechas'

export const GAME_START_DATE = INICIO_JUEGO

export const CLAVE_ESTADO_QUIZ = 'seonose-quiz-state'
export const CLAVE_HISTORIAL_RESULTADOS = 'seonose-results-history'

export const normalizar = (value?: string) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

/**
 * Número del desafío de hoy. Usa la fecha de Argentina, igual que el servidor:
 * antes dependía de la hora local del dispositivo y alguien fuera del país
 * podía compartir un número distinto del que estaba jugando.
 */
export const obtenerNumeroPartida = () => numeroDeDesafio(getTodayKey())

export const obtenerSiguienteIteracion = () => {
  const now = new Date()
  const next = new Date(now)

  next.setHours(24, 0, 0, 0)

  return next
}

export const formatearTiempoRestante = (target: Date) => {
  const diff = Math.max(0, target.getTime() - Date.now())

  const totalSeconds = Math.floor(diff / 1000)

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`
}

/**
 * Estado de la partida en curso. `clave` permite tener más de una partida
 * guardada a la vez (la de hoy y la de un día anterior) sin que se pisen; por
 * defecto es la de siempre, así el desafío diario lee lo que ya había.
 */
export const cargarEstadoGuardado = <T = unknown>(expectedDayKey?: string, clave: string = CLAVE_ESTADO_QUIZ) => {
  try {
    const raw = window.localStorage.getItem(clave)

    if (!raw) return null

    const parsed = JSON.parse(raw) as T & { gameNumber?: number; dayKey?: string }

    if (parsed.dayKey !== undefined) {
      // Formato nuevo: se valida por día (mismo criterio que el reset diario).
      if (expectedDayKey !== undefined && parsed.dayKey !== expectedDayKey) {
        return null
      }
    } else if (parsed.gameNumber !== undefined && parsed.gameNumber !== obtenerNumeroPartida()) {
      // Compatibilidad con estados guardados antes de incluir dayKey.
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export const guardarEstadoQuiz = (state: unknown, clave: string = CLAVE_ESTADO_QUIZ) => {
  try {
    window.localStorage.setItem(clave, JSON.stringify(state))
  } catch {
    // Ignore storage errors
  }
}

export const limpiarEstadoQuiz = (clave: string = CLAVE_ESTADO_QUIZ) => {
  try {
    window.localStorage.removeItem(clave)
  } catch {
    // Ignore storage errors
  }
}

/**
 * ¿Este dispositivo ya terminó alguna partida?
 *
 * El historial se escribe en `localStorage` al terminar cada partida, antes de
 * intentar guardarla en Supabase, así que es una prueba local y confiable de que
 * el dispositivo ya usó la app. Se usa como requisito para heredar una identidad
 * previa: sin esta prueba, un visitante nuevo podría quedarse con la cuenta de
 * otro sólo por compartir la IP de salida.
 */
export const tieneHistorialLocal = () => {
  try {
    const crudo = window.localStorage.getItem(CLAVE_HISTORIAL_RESULTADOS)

    if (!crudo) return false

    const historial = JSON.parse(crudo)

    return Array.isArray(historial) && historial.length > 0
  } catch {
    return false
  }
}

export const guardarResultadoEnHistorial = (answers: { isCorrect: boolean }[]) => {
  try {
    const correctCount = answers.filter((a) => a.isCorrect).length

    const result = {
      date: new Date().toISOString(),
      total: answers.length,
      correct: correctCount,
      percentage: Math.round((correctCount / answers.length) * 100),
    }

    const history = JSON.parse(window.localStorage.getItem(CLAVE_HISTORIAL_RESULTADOS) ?? '[]')

    history.push(result)

    window.localStorage.setItem(CLAVE_HISTORIAL_RESULTADOS, JSON.stringify(history))
  } catch {
    // Ignore storage errors
  }
}
