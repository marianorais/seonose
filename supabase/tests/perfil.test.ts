import { describe, expect, it } from 'vitest'

import { comoAnon, crearBase, fijarAhora, guardarPartida, rpc } from './base'

const ALIAS = 'jugador-perfil-01'
const DISPOSITIVO = 'jugador-perfil-movil'

interface RespuestaPerfil {
  estado: string
  alias?: string
  avatar?: string
}

describe('perfil del jugador', () => {
  it('crea y actualiza el perfil sin cambiar el playerid ni sus partidas', async () => {
    const db = await crearBase()
    await fijarAhora(db, '2026-10-15T12:00:00-03:00')
    await guardarPartida(db, {
      playerid: ALIAS,
      completedat: '2026-10-15T13:00:00-03:00',
      ids: [1, 2, 3],
      correctas: 2,
    })

    const creado = await rpc<RespuestaPerfil>(db, 'guardar_perfil_jugador', {
      p_playerid: ALIAS,
      p_alias: '  Sofía  ',
      p_avatar: '🦊',
    })

    expect(creado).toMatchObject({ estado: 'ok', alias: 'Sofía', avatar: '🦊' })

    const actualizado = await rpc<RespuestaPerfil>(db, 'guardar_perfil_jugador', {
      p_playerid: ALIAS,
      p_alias: 'Sofi',
      p_avatar: '🐼',
    })

    expect(actualizado).toMatchObject({ estado: 'ok', alias: 'Sofi', avatar: '🐼' })

    const jugador = await comoAnon<{ playerid: string; alias: string; avatar: string }>(
      db,
      `select s.playerid, a.alias, a.avatar
         from game_sessions s
         join player_aliases a on a.playerid = s.playerid
        where s.playerid = $1`,
      [ALIAS]
    )
    expect(jugador.rows).toEqual([{ playerid: ALIAS, alias: 'Sofi', avatar: '🐼' }])
  })

  it('permite crear un alias y avatar para una identidad sin alias previo', async () => {
    const db = await crearBase()

    const respuesta = await rpc<RespuestaPerfil>(db, 'guardar_perfil_jugador', {
      p_playerid: DISPOSITIVO,
      p_alias: 'Primera partida',
      p_avatar: '🎮',
    })

    expect(respuesta).toMatchObject({ estado: 'ok', alias: 'Primera partida', avatar: '🎮' })
    expect(
      (await comoAnon<{ playerid: string; grupo: string }>(
        db,
        'select playerid, grupo from player_aliases where playerid = $1',
        [DISPOSITIVO]
      )).rows
    ).toEqual([{ playerid: DISPOSITIVO, grupo: DISPOSITIVO }])
  })

  it('devuelve el alias y avatar actualizados en el ranking y actividad de sala', async () => {
    const db = await crearBase()
    await fijarAhora(db, '2026-10-15T12:00:00-03:00')
    await rpc(db, 'guardar_perfil_jugador', {
      p_playerid: ALIAS,
      p_alias: 'Sala perfil',
      p_avatar: '🐬',
    })
    const sala = await rpc<{ estado: string; codigo: string }>(db, 'crear_sala', {
      p_playerid: ALIAS,
      p_nombre: 'Perfil',
    })
    await guardarPartida(db, {
      playerid: ALIAS,
      completedat: '2026-10-15T13:00:00-03:00',
      ids: [1, 2, 3],
      correctas: 2,
    })

    const ranking = await rpc<{
      tabla: { alias: string; avatar: string }[]
      actividad: { alias: string; avatar: string }[]
    }>(db, 'ranking_sala', { p_codigo: sala.codigo, p_playerid: ALIAS })

    expect(ranking.tabla[0]).toMatchObject({ alias: 'Sala perfil', avatar: '🐬' })
    expect(ranking.actividad[0]).toMatchObject({ alias: 'Sala perfil', avatar: '🐬' })
  })

  it('mantiene el grupo de identidades al editar desde un dispositivo secundario', async () => {
    const db = await crearBase()
    await db.query('insert into player_aliases (playerid, alias, grupo) values ($1, $2, $1)', [ALIAS, 'Actual'])
    await db.query('insert into player_aliases (playerid, alias, grupo) values ($1, null, $2)', [DISPOSITIVO, ALIAS])

    const respuesta = await rpc<RespuestaPerfil>(db, 'guardar_perfil_jugador', {
      p_playerid: DISPOSITIVO,
      p_alias: 'Nuevo nombre',
      p_avatar: '🦉',
    })

    expect(respuesta.estado).toBe('ok')
    expect(
      (await comoAnon<{ playerid: string; alias: string; avatar: string; grupo: string }>(
        db,
        'select playerid, alias, avatar, grupo from player_aliases where playerid = $1',
        [ALIAS]
      )).rows
    ).toEqual([{ playerid: ALIAS, alias: 'Nuevo nombre', avatar: '🦉', grupo: ALIAS }])
  })

  it('valida alias, avatar permitido y unicidad del alias', async () => {
    const db = await crearBase()

    for (const alias of ['', ' '.repeat(4), 'x'.repeat(31)]) {
      const respuesta = await rpc<RespuestaPerfil>(db, 'guardar_perfil_jugador', {
        p_playerid: ALIAS,
        p_alias: alias,
        p_avatar: '👤',
      })
      expect(respuesta.estado).toBe('alias-invalido')
    }

    expect(
      (await rpc<RespuestaPerfil>(db, 'guardar_perfil_jugador', {
        p_playerid: ALIAS,
        p_alias: 'Jugador',
        p_avatar: 'no-es-un-avatar',
      })).estado
    ).toBe('avatar-invalido')

    await rpc(db, 'guardar_perfil_jugador', {
      p_playerid: ALIAS,
      p_alias: 'Alias único',
      p_avatar: '🌟',
    })

    expect(
      (await rpc<RespuestaPerfil>(db, 'guardar_perfil_jugador', {
        p_playerid: DISPOSITIVO,
        p_alias: 'Alias único',
        p_avatar: '🐧',
      })).estado
    ).toBe('duplicado')
  })

  it('guarda los nuevos avatares predefinidos', async () => {
    const db = await crearBase()

    const respuesta = await rpc<RespuestaPerfil>(db, 'guardar_perfil_jugador', {
      p_playerid: ALIAS,
      p_alias: 'Cohete',
      p_avatar: '🚀',
    })

    expect(respuesta).toMatchObject({ estado: 'ok', avatar: '🚀' })
  })
})
