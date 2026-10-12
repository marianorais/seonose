/**
 * Llamadas a las funciones del servidor (RPC de Supabase).
 *
 * Todas devuelven el mismo resultado discriminado, así cada pantalla distingue
 * "no hay conexión" (se puede reintentar) de "el servidor respondió mal" sin
 * tener que interpretar mensajes de error. Los errores se registran en la
 * consola; nunca se reemplazan por datos inventados.
 */
import { supabase } from './supabase'

export type ErrorRpc = 'red' | 'servidor'

export type ResultadoRpc<T> = { ok: true; datos: T } | { ok: false; error: ErrorRpc }

const pareceErrorDeRed = (mensaje: string) =>
  (typeof navigator !== 'undefined' && navigator.onLine === false) ||
  /failed to fetch|networkerror|network request failed|load failed|fetch failed|timeout/i.test(mensaje)

export const llamarRpc = async <T>(nombre: string, parametros: Record<string, unknown>): Promise<ResultadoRpc<T>> => {
  try {
    const { data, error } = await supabase.rpc(nombre, parametros)

    if (error) {
      console.error(`Error en ${nombre}:`, error.message)
      return { ok: false, error: pareceErrorDeRed(error.message) ? 'red' : 'servidor' }
    }

    return { ok: true, datos: data as T }
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error)
    console.error(`Error en ${nombre}:`, mensaje)

    return { ok: false, error: pareceErrorDeRed(mensaje) ? 'red' : 'servidor' }
  }
}

/** Mensaje para el usuario según el tipo de error. */
export const mensajeDeError = (error: ErrorRpc) =>
  error === 'red'
    ? 'No hay conexión. Revisá tu internet y probá de nuevo.'
    : 'Algo salió mal de nuestro lado. Probá de nuevo en un momento.'
