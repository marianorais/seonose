/**
 * Utilidades compartidas para el Quiz (helpers de estado, tiempo y normalización).
 * No cambian la lógica de negocio; solo agrupan funciones para mejorar modularidad.
 */

export const GAME_START_DATE = '2026-05-01'

export const CLAVE_ESTADO_QUIZ = 'seonose-quiz-state'
export const CLAVE_HISTORIAL_RESULTADOS = 'seonose-results-history'

export const normalizar = (value?: string) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

export const obtenerNumeroPartida = () => {
  const start = new Date(GAME_START_DATE)
  const today = new Date()

  start.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)

  const diffMs = today.getTime() - start.getTime()

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  return diffDays + 1
}

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

export const cargarEstadoGuardado = <T = any>() => {
  try {
    const raw = window.localStorage.getItem(CLAVE_ESTADO_QUIZ)

    if (!raw) return null

    const parsed = JSON.parse(raw) as T & { gameNumber?: number }

    // Si pertenece a otra partida, se invalida
    if (parsed.gameNumber !== undefined && parsed.gameNumber !== obtenerNumeroPartida()) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export const guardarEstadoQuiz = (state: any) => {
  try {
    window.localStorage.setItem(CLAVE_ESTADO_QUIZ, JSON.stringify(state))
  } catch {
    // Ignore storage errors
  }
}

export const limpiarEstadoQuiz = () => {
  try {
    window.localStorage.removeItem(CLAVE_ESTADO_QUIZ)
  } catch {
    // Ignore storage errors
  }
}

export const guardarResultadoEnHistorial = (answers: any[]) => {
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
