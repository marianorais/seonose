/**
 * Fechas del juego. "El día" es siempre el de Argentina (ver `getTodayKey`) y
 * las fechas viajan como texto `YYYY-MM-DD`, igual que en la base: así nunca
 * se corren por una conversión a UTC.
 */

/** Primer día del juego: el desafío #1. Igual que `privado.inicio_juego()`. */
export const INICIO_JUEGO = '2026-07-07'

const MS_POR_DIA = 24 * 60 * 60 * 1000

const aUtc = (fecha: string) => {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  return Date.UTC(anio, mes - 1, dia)
}

/** `YYYY-MM-DD` válido. */
export const esFechaValida = (fecha: string | undefined | null): fecha is string => {
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false

  const [anio, mes, dia] = fecha.split('-').map(Number)
  const fechaUtc = new Date(Date.UTC(anio, mes - 1, dia))

  return fechaUtc.getUTCFullYear() === anio && fechaUtc.getUTCMonth() === mes - 1 && fechaUtc.getUTCDate() === dia
}

/** Número del desafío de una fecha (el `#97` que se comparte). */
export const numeroDeDesafio = (fecha: string) => Math.round((aUtc(fecha) - aUtc(INICIO_JUEGO)) / MS_POR_DIA) + 1

export const sumarDias = (fecha: string, dias: number) =>
  new Date(aUtc(fecha) + dias * MS_POR_DIA).toISOString().slice(0, 10)

/** "sábado 10 de octubre". La fecha se formatea en UTC para no correrla. */
export const formatearFechaLarga = (fecha: string) =>
  new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
    new Date(aUtc(fecha))
  )

/** "10 de octubre". */
export const formatearFechaCorta = (fecha: string) =>
  new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(aUtc(fecha)))

/** "hace 5 minutos", "ayer", etc., para la actividad de una sala. */
export const formatearHaceCuanto = (momento: string, ahora: Date = new Date()) => {
  const segundos = Math.max(0, Math.round((ahora.getTime() - new Date(momento).getTime()) / 1000))
  const formato = new Intl.RelativeTimeFormat('es-AR', { numeric: 'auto' })

  if (segundos < 60) return 'recién'
  if (segundos < 3600) return formato.format(-Math.floor(segundos / 60), 'minute')
  if (segundos < 86400) return formato.format(-Math.floor(segundos / 3600), 'hour')

  return formato.format(-Math.floor(segundos / 86400), 'day')
}
