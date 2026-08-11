/**
 * Alias del jugador, con agrupamiento de dispositivos en una sola tabla.
 *
 * `player_aliases` tiene una fila por identidad de dispositivo y una columna
 * `grupo` que apunta a la identidad que representa a la persona. El alias de un
 * grupo es el de la fila donde `playerid = grupo`; las secundarias tienen alias
 * nulo. Así una misma persona con varios dispositivos es UN jugador del ranking,
 * sin borrar alias ni reescribir partidas.
 *
 * Por qué no se identifica por IP: no identifica un dispositivo. Rota por CGNAT,
 * IP dinámica y VPN, y sobre todo por iCloud Private Relay, cuyos nodos de
 * salida están compartidos por miles de usuarios de Apple. La columna `ip` queda
 * sólo como referencia de la conexión desde la que se registró una identidad, y
 * se usa únicamente para el vínculo con el esquema viejo.
 */

import { supabase } from './supabase'
import { getClientInfo } from './userSession'
import { adopcionPendiente, cerrarAdopcion } from './playerIdentity'
import { tieneHistorialLocal } from './quizHelpers'

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

export interface MapaIdentidades {
  /** `true` si se pudo leer la tabla. `false` deja al ranking con alias generados. */
  ok: boolean
  /** Identidad de dispositivo -> grupo (la persona). */
  grupoPorIdentidad: Map<string, string>
  /** Grupo -> alias elegido por esa persona. */
  aliasPorGrupo: Map<string, string>
}

interface FilaAlias {
  playerid: string | null
  alias: string | null
  grupo: string | null
}

const MAPA_VACIO: MapaIdentidades = {
  ok: false,
  grupoPorIdentidad: new Map(),
  aliasPorGrupo: new Map(),
}

/**
 * Se cachea por carga de página: el ranking y el chequeo de alias necesitan lo
 * mismo, y la tabla es chica. Evita repetir la consulta (el egress sí se factura,
 * a diferencia de la cantidad de tablas).
 */
let cacheMapa: Promise<MapaIdentidades> | null = null

export const invalidarCacheIdentidades = () => {
  cacheMapa = null
}

export const obtenerMapaIdentidades = (limite: number): Promise<MapaIdentidades> => {
  if (cacheMapa) return cacheMapa

  cacheMapa = (async () => {
    const { data, error } = await supabase
      .from('player_aliases')
      .select('playerid,alias,grupo')
      .limit(limite)

    if (error) {
      // Sin la columna `grupo` (migración sin correr) el ranking sigue andando
      // con los alias generados automáticamente.
      console.warn('No se pudieron leer las identidades:', error.message)
      cacheMapa = null

      return MAPA_VACIO
    }

    const grupoPorIdentidad = new Map<string, string>()
    const aliasPorGrupo = new Map<string, string>()

    for (const fila of (data ?? []) as FilaAlias[]) {
      if (!fila.playerid) continue

      // Sin `grupo`, cada identidad es su propia persona.
      const grupo = fila.grupo ?? fila.playerid

      grupoPorIdentidad.set(fila.playerid, grupo)

      // El nombre del grupo es el de la fila principal (`playerid === grupo`).
      if (fila.alias && fila.playerid === grupo) aliasPorGrupo.set(grupo, fila.alias)
    }

    return { ok: true, grupoPorIdentidad, aliasPorGrupo }
  })()

  return cacheMapa
}

/**
 * Alias de una identidad, resolviendo su grupo. `ok: false` significa que no se
 * pudo consultar: en ese caso no se le pregunta nada al jugador, para no
 * ofrecerle algo que después no se va a poder guardar.
 */
export const obtenerAliasDePlayer = async (
  playerId: string
): Promise<{ ok: boolean; alias: string | null }> => {
  const mapa = await obtenerMapaIdentidades(5000)

  if (!mapa.ok) return { ok: false, alias: null }

  const grupo = mapa.grupoPorIdentidad.get(playerId)
  const alias = grupo ? mapa.aliasPorGrupo.get(grupo) ?? null : null

  if (alias) guardarAliasLocal(alias)

  return { ok: true, alias }
}

interface RespuestaFuncion {
  estado?: string
  alias?: string
}

/**
 * Vínculo único con el esquema viejo: si esta conexión ya tenía un alias elegido
 * cuando la identidad era la IP, el dispositivo se suma como identidad más de esa
 * misma persona. Conserva su propio identificador —no lo reemplaza— así que no
 * puede quedar ninguna partida huérfana.
 *
 * Devuelve el alias si quedó vinculado.
 */
export const intentarVincularIdentidad = async (playerId: string): Promise<string | null> => {
  if (!adopcionPendiente()) return null

  /*
   * Requisito imprescindible: este dispositivo tiene que haber jugado antes.
   *
   * Sin esta prueba el vínculo por IP sería una vía de apropiación de cuentas:
   * las IPs de salida se comparten —CGNAT de las operadoras y, sobre todo, los
   * nodos de iCloud Private Relay, que sirven a miles de usuarios de Apple por
   * la misma dirección—, así que un visitante que nunca jugó podría entrar por
   * la misma IP que otro y quedarse con su alias y su historial.
   *
   * Un dispositivo que ya jugó tiene su historial local; uno recién llegado, no.
   */
  if (!tieneHistorialLocal()) {
    cerrarAdopcion()
    return null
  }

  const ip = await obtenerIpActual()

  if (!ip) return null

  const { data, error } = await supabase.rpc('vincular_identidad_por_ip', {
    p_playerid: playerId,
    p_ip: ip,
  })

  if (error) {
    // Se reintenta en la próxima visita: no se cierra la ventana.
    console.warn('No se pudo revisar la identidad heredada:', error.message)
    return null
  }

  const respuesta = (data ?? {}) as RespuestaFuncion

  // Se cierra en cualquier caso resuelto, para no consultar en cada visita.
  cerrarAdopcion()

  if (respuesta.estado !== 'ok' || !respuesta.alias) return null

  guardarAliasLocal(respuesta.alias)
  invalidarCacheIdentidades()

  return respuesta.alias
}

export type ResultadoAlias =
  | { ok: true }
  | { ok: false; motivo: 'duplicado' | 'ya-tiene' | 'vacio' | 'error' }

/**
 * Guarda el alias elegido, creando el grupo propio del dispositivo
 * (`grupo = playerid`). La policy de Supabase sólo admite esa forma: nadie puede
 * insertarse en el grupo de otro, y sin permiso de update el alias es definitivo.
 */
export const guardarAlias = async (
  playerId: string,
  aliasIngresado: string
): Promise<ResultadoAlias> => {
  const alias = aliasIngresado.trim()

  // Requisito: no se permite continuar con un alias vacío o de sólo espacios.
  // La policy valida lo mismo del lado del servidor.
  if (!alias) return { ok: false, motivo: 'vacio' }

  const ip = await obtenerIpActual()

  const { error } = await supabase
    .from('player_aliases')
    .insert({ playerid: playerId, alias, ip, grupo: playerId })

  if (!error) {
    guardarAliasLocal(alias)
    cerrarAdopcion()
    invalidarCacheIdentidades()

    return { ok: true }
  }

  // 23505 = unique_violation: por la clave primaria (esta identidad ya eligió
  // alias desde otra pestaña) o por el índice único del alias (ya lo usa otro).
  if (error.code === '23505') {
    invalidarCacheIdentidades()

    const propio = await obtenerAliasDePlayer(playerId)

    return { ok: false, motivo: propio.alias ? 'ya-tiene' : 'duplicado' }
  }

  console.error('No se pudo guardar el alias:', error.message)

  return { ok: false, motivo: 'error' }
}
