/**
 * Alias del jugador, identificado por su IP pública.
 *
 * El modelo es deliberadamente simple: una fila por IP en `player_aliases`.
 * Al entrar al ranking se consulta si la IP actual ya tiene alias; si lo tiene
 * no se vuelve a preguntar nada, y si no lo tiene se ofrece elegirlo una vez.
 * Las partidas (`game_sessions`) no cambian: ya guardan `userip`, así que el
 * ranking une alias y estadísticas por esa columna.
 *
 * Límites conocidos y asumidos de identificar por IP: detrás de una IP pública
 * puede haber varias personas (comparten alias y estadísticas) y quien cambie
 * de IP —IP dinámica, VPN, wifi↔datos— aparece como un jugador nuevo.
 */

import { supabase } from './supabase'
import { getClientInfo } from './userSession'

const CLAVE_ALIAS_RECHAZADO = 'seonose-alias-rechazado'

/** Cachea la IP: `getClientInfo` pega a un servicio externo. */
let ipEnMemoria: string | null | undefined

export const obtenerIpActual = async (): Promise<string | null> => {
  if (ipEnMemoria !== undefined) return ipEnMemoria

  try {
    const info = await getClientInfo()
    ipEnMemoria = info.ip
  } catch {
    ipEnMemoria = null
  }

  return ipEnMemoria
}

/**
 * Alias de una IP. `ok: false` significa que no se pudo consultar (por ejemplo
 * si todavía no se creó la tabla): en ese caso no se le pregunta nada al
 * jugador, para no ofrecerle algo que después no se va a poder guardar.
 */
export const obtenerAliasDeIp = async (ip: string): Promise<{ ok: boolean; alias: string | null }> => {
  const { data, error } = await supabase
    .from('player_aliases')
    .select('alias')
    .eq('ip', ip)
    .maybeSingle()

  if (error) {
    console.warn('No se pudo consultar el alias de la IP:', error.message)
    return { ok: false, alias: null }
  }

  return { ok: true, alias: (data?.alias as string | undefined) ?? null }
}

/** Todos los alias ya elegidos, indexados por IP, para armar el ranking. */
export const obtenerAliasPorIp = async (limite: number): Promise<Map<string, string>> => {
  const aliasPorIp = new Map<string, string>()

  const { data, error } = await supabase.from('player_aliases').select('ip,alias').limit(limite)

  if (error) {
    // Sin la tabla el ranking sigue funcionando con los alias generados.
    console.warn('No se pudieron leer los alias:', error.message)
    return aliasPorIp
  }

  for (const row of (data ?? []) as { ip: string; alias: string | null }[]) {
    if (row.ip && row.alias) aliasPorIp.set(row.ip, row.alias)
  }

  return aliasPorIp
}

/**
 * Recuerda que el jugador dijo "ahora no". La IP sola no alcanza para saberlo
 * (no hay fila que lo registre) y sin esto el pedido reaparecería cada vez que
 * abre el ranking.
 */
export const aliasRechazado = () => {
  try {
    return window.localStorage.getItem(CLAVE_ALIAS_RECHAZADO) === '1'
  } catch {
    return false
  }
}

export const marcarAliasRechazado = () => {
  try {
    window.localStorage.setItem(CLAVE_ALIAS_RECHAZADO, '1')
  } catch {
    // Ignore storage errors
  }
}

export type ResultadoAlias =
  | { ok: true }
  | { ok: false; motivo: 'duplicado' | 'ip-ocupada' | 'vacio' | 'error' }

/**
 * Guarda el alias de la IP. Es un `insert` a secas y definitivo: la tabla no
 * tiene permiso de update, así que una vez elegido nadie puede pisarlo.
 */
export const guardarAlias = async (ip: string, aliasIngresado: string): Promise<ResultadoAlias> => {
  const alias = aliasIngresado.trim()

  if (!alias) return { ok: false, motivo: 'vacio' }

  const { error } = await supabase.from('player_aliases').insert({ ip, alias })

  if (!error) return { ok: true }

  // 23505 = unique_violation. Puede ser por la clave primaria (esa IP ya eligió
  // alias desde otra pestaña) o por el índice único del alias (ya lo usa otro).
  if (error.code === '23505') {
    const yaTieneAlias = await obtenerAliasDeIp(ip)

    return { ok: false, motivo: yaTieneAlias.alias ? 'ip-ocupada' : 'duplicado' }
  }

  console.error('No se pudo guardar el alias:', error.message)

  return { ok: false, motivo: 'error' }
}
