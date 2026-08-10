/**
 * Alias del jugador, asociado a su identidad estable (ver `playerIdentity`).
 *
 * Antes la clave era la IP pública, y en móvil eso se rompía: la IP rota y el
 * jugador perdía su alias al refrescar. Ahora `player_aliases` se indexa por
 * `playerid`, que vive en el dispositivo y no cambia.
 *
 * La columna `ip` se conserva sólo para la adopción única: las partidas y los
 * alias anteriores a este esquema quedaron identificados como `'ip:<IP>'`, así
 * que un dispositivo que arranca por primera vez puede heredar esa identidad y
 * no perder su historial.
 *
 * El alias también se guarda localmente para que la app sepa sin consultar la
 * red si ya hay uno elegido: en móvil la consulta puede tardar o fallar, y no
 * queremos volver a pedir un alias que ya existe.
 */

import { supabase } from './supabase'
import { getClientInfo } from './userSession'
import { adoptarPlayerId, adopcionPendiente, cerrarAdopcion, esIdLegado } from './playerIdentity'

const CLAVE_ALIAS_LOCAL = 'seonose-player-alias'

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

export const obtenerAliasLocal = (): string | null => {
  try {
    const guardado = window.localStorage.getItem(CLAVE_ALIAS_LOCAL)

    return guardado && guardado.trim() ? guardado : null
  } catch {
    return null
  }
}

const guardarAliasLocal = (alias: string) => {
  try {
    window.localStorage.setItem(CLAVE_ALIAS_LOCAL, alias)
  } catch {
    // Ignore storage errors
  }
}

/**
 * Alias de una identidad. `ok: false` significa que no se pudo consultar (por
 * ejemplo si todavía no se corrió la migración): en ese caso no se le pregunta
 * nada al jugador, para no ofrecerle algo que después no se va a poder guardar.
 */
export const obtenerAliasDePlayer = async (
  playerId: string
): Promise<{ ok: boolean; alias: string | null }> => {
  const { data, error } = await supabase
    .from('player_aliases')
    .select('alias')
    .eq('playerid', playerId)
    .maybeSingle()

  if (error) {
    console.warn('No se pudo consultar el alias:', error.message)
    return { ok: false, alias: null }
  }

  const alias = (data?.alias as string | undefined) ?? null

  if (alias) guardarAliasLocal(alias)

  return { ok: true, alias }
}

/** Todos los alias elegidos, indexados por identidad, para armar el ranking. */
export const obtenerAliasPorPlayer = async (limite: number): Promise<Map<string, string>> => {
  const aliasPorPlayer = new Map<string, string>()

  const { data, error } = await supabase.from('player_aliases').select('playerid,alias').limit(limite)

  if (error) {
    // Sin la tabla el ranking sigue funcionando con los alias generados.
    console.warn('No se pudieron leer los alias:', error.message)
    return aliasPorPlayer
  }

  for (const row of (data ?? []) as { playerid: string | null; alias: string | null }[]) {
    if (row.playerid && row.alias) aliasPorPlayer.set(row.playerid, row.alias)
  }

  return aliasPorPlayer
}

/**
 * Adopción única: si esta conexión ya había elegido un alias con el esquema
 * viejo (fila con `playerid` heredado `'ip:<IP>'`), el dispositivo toma esa
 * identidad en lugar de su UUID recién creado. Así conserva su alias y todas
 * las partidas que había jugado.
 *
 * Corre como máximo una vez por dispositivo y sólo sobre filas heredadas, para
 * que no se convierta en una regla permanente de reclamo de IPs —que es
 * precisamente lo inseguro, porque en móvil una misma IP pasa por varias
 * personas.
 *
 * Devuelve el alias heredado si adoptó algo.
 */
export const intentarAdoptarIdentidad = async (): Promise<string | null> => {
  if (!adopcionPendiente()) return null

  const ip = await obtenerIpActual()

  if (!ip) return null

  const { data, error } = await supabase
    .from('player_aliases')
    .select('playerid,alias')
    .eq('ip', ip)
    .limit(5)

  if (error) {
    // Se reintenta en la próxima visita: no se cierra la ventana de adopción.
    console.warn('No se pudo revisar la identidad heredada:', error.message)
    return null
  }

  const filas = (data ?? []) as { playerid: string | null; alias: string | null }[]
  const heredada = filas.find((fila) => fila.playerid && esIdLegado(fila.playerid) && fila.alias)

  if (!heredada?.playerid || !heredada.alias) {
    // No hay nada que heredar: se cierra para no consultar en cada visita.
    cerrarAdopcion()
    return null
  }

  adoptarPlayerId(heredada.playerid)
  guardarAliasLocal(heredada.alias)

  return heredada.alias
}

export type ResultadoAlias =
  | { ok: true }
  | { ok: false; motivo: 'duplicado' | 'ya-tiene' | 'vacio' | 'error' }

/**
 * Guarda el alias de la identidad. Es un `insert` a secas y definitivo: la tabla
 * no tiene permiso de update, así que una vez elegido nadie puede pisarlo.
 *
 * La IP se guarda sólo como referencia de la conexión desde la que se eligió;
 * no se usa para identificar al jugador.
 */
export const guardarAlias = async (
  playerId: string,
  aliasIngresado: string
): Promise<ResultadoAlias> => {
  const alias = aliasIngresado.trim()

  // Requisito: no se permite continuar con un alias vacío o de sólo espacios.
  if (!alias) return { ok: false, motivo: 'vacio' }

  const ip = await obtenerIpActual()

  const { error } = await supabase.from('player_aliases').insert({ playerid: playerId, alias, ip })

  if (!error) {
    guardarAliasLocal(alias)
    // Ya hay alias propio: no tiene sentido heredar otra identidad.
    cerrarAdopcion()

    return { ok: true }
  }

  // 23505 = unique_violation. Puede ser por la clave primaria (esta identidad ya
  // eligió alias desde otra pestaña) o por el índice único del alias.
  if (error.code === '23505') {
    const propio = await obtenerAliasDePlayer(playerId)

    return { ok: false, motivo: propio.alias ? 'ya-tiene' : 'duplicado' }
  }

  console.error('No se pudo guardar el alias:', error.message)

  return { ok: false, motivo: 'error' }
}
