import type { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

import { comoAnon, crearBase, fijarAhora, guardarPartida, rpc } from './base'

const ANA = 'ana-dispositivo-01'
const BETO = 'beto-dispositivo-1'
const CAMI = 'cami-dispositivo-1'
const SIN_ALIAS = 'anonimo-disp-0001'
const OCHO = [1, 2, 3, 4, 5, 6, 7, 8]

interface Fila {
  alias: string
  puntos: number
  partidas: number
  victorias: number
  porcentaje: number
  posicion: number
  jugo_hoy: boolean
  es_actual: boolean
}

interface Ranking {
  estado: string
  sala: { nombre: string; integrantes: number; soy_propietario: boolean; desde: string }
  tabla: Fila[]
  actividad: { alias: string; es_anterior: boolean; fecha: string }[]
}

type Estado = { estado: string; codigo?: string; nombre?: string }

const base = async () => {
  const db = await crearBase()
  await fijarAhora(db, '2026-10-09T09:00:00-03:00')
  for (const [playerid, alias] of [[ANA, 'Ana'], [BETO, 'Beto'], [CAMI, 'Cami']]) {
    await db.query(`insert into player_aliases (playerid, alias, grupo) values ($1, $2, $1)`, [playerid, alias])
  }
  return db
}

const crear = (db: PGlite, playerid: string, nombre: string) => rpc<Estado>(db, 'crear_sala', { p_playerid: playerid, p_nombre: nombre })
const jugar = (db: PGlite, playerid: string, completedat: string, correctas: number, anterior?: string) =>
  guardarPartida(db, { playerid, completedat, ids: OCHO, correctas, anterior })

describe('crear una sala', () => {
  let db: PGlite

  beforeAll(async () => {
    db = await base()
  })

  it('con un nombre válido: código aleatorio y el creador adentro', async () => {
    const sala = await crear(db, ANA, '  Los   del fútbol ')

    expect(sala).toMatchObject({ estado: 'ok', nombre: 'Los del fútbol' })
    expect(sala.codigo).toMatch(/^[a-km-np-z2-9]{10}$/)

    const ranking = await rpc<Ranking>(db, 'ranking_sala', { p_codigo: sala.codigo, p_playerid: ANA })
    expect(ranking.sala).toMatchObject({ integrantes: 1, soy_propietario: true })
  })

  it('rechaza nombres inválidos y pide alias', async () => {
    for (const nombre of ['', '   ', 'x'.repeat(41), '<script>']) {
      expect((await crear(db, ANA, nombre)).estado).toBe('nombre-invalido')
    }
    expect((await crear(db, SIN_ALIAS, 'Mi sala')).estado).toBe('sin-alias')
  })

  it('limita a 5 salas por día', async () => {
    const otra = await base()
    const estados = []
    for (let i = 0; i < 6; i += 1) estados.push((await crear(otra, BETO, `Sala ${i}`)).estado)

    expect(estados).toEqual(['ok', 'ok', 'ok', 'ok', 'ok', 'limite-creacion'])
  })

  it('las tablas no se pueden tocar desde el navegador', async () => {
    await expect(comoAnon(db, 'select * from salas')).rejects.toThrow(/permission denied/)
    await expect(comoAnon(db, `insert into sala_miembros (sala_id, playerid) values (1, 'colado-12345')`)).rejects.toThrow(
      /permission denied/
    )
    await expect(comoAnon(db, `select public._tabla_sala(1)`)).rejects.toThrow(/permission denied/)
  })
})

describe('invitaciones', () => {
  it('quien abre el link ve la sala pero no el ranking hasta unirse', async () => {
    const db = await base()
    const { codigo } = await crear(db, ANA, 'Oficina')

    const vista = await rpc<Record<string, unknown>>(db, 'ver_sala', { p_codigo: codigo!.toUpperCase(), p_playerid: BETO })
    expect(vista).toMatchObject({ estado: 'ok', nombre: 'Oficina', creada_por: 'Ana', integrantes: 1, es_integrante: false })
    expect((await rpc<Estado>(db, 'ranking_sala', { p_codigo: codigo, p_playerid: BETO })).estado).toBe('no-integrante')

    expect((await rpc<Estado>(db, 'unirse_sala', { p_codigo: codigo, p_playerid: SIN_ALIAS })).estado).toBe('sin-alias')
    expect((await rpc<Estado>(db, 'unirse_sala', { p_codigo: codigo, p_playerid: BETO })).estado).toBe('ok')
    expect((await rpc<Estado>(db, 'unirse_sala', { p_codigo: codigo, p_playerid: BETO })).estado).toBe('ok')

    expect((await rpc<Ranking>(db, 'ranking_sala', { p_codigo: codigo, p_playerid: BETO })).sala.integrantes).toBe(2)
  })

  it('códigos inválidos no revelan nada', async () => {
    const db = await base()
    for (const malo of ['', 'abc', 'zzzzzzzzzz', "x' or 1=1"]) {
      expect((await rpc<Estado>(db, 'ver_sala', { p_codigo: malo, p_playerid: BETO })).estado).toBe('no-existe')
    }
  })

  it('respeta el cupo de 50', async () => {
    const db = await base()
    const { codigo } = await crear(db, ANA, 'Llena')
    await db.exec(`insert into sala_miembros (sala_id, playerid)
                   select (select id from salas where codigo = '${codigo}'), 'relleno-' || g from generate_series(1, 49) g`)

    expect((await rpc<Estado>(db, 'unirse_sala', { p_codigo: codigo, p_playerid: BETO })).estado).toBe('sala-llena')
  })
})

describe('ranking de la sala', () => {
  let db: PGlite
  let codigo: string

  beforeAll(async () => {
    db = await base()

    // Antes de crear la sala: no cuenta.
    await jugar(db, CAMI, '2026-10-08T10:00:00-03:00', 8)

    codigo = (await crear(db, ANA, 'Facu')).codigo!
    await rpc(db, 'unirse_sala', { p_codigo: codigo, p_playerid: BETO })
    await rpc(db, 'unirse_sala', { p_codigo: codigo, p_playerid: CAMI })

    // 09/10: Ana 6, Beto 6 (empate: ganan los dos). La repetición de Beto no cuenta.
    await jugar(db, ANA, '2026-10-09T10:00:00-03:00', 6)
    await jugar(db, BETO, '2026-10-09T10:05:00-03:00', 6)
    await jugar(db, BETO, '2026-10-09T10:10:00-03:00', 8)

    // 10/10: Ana 7, Beto 5, Cami 8.
    await jugar(db, ANA, '2026-10-10T10:00:00-03:00', 7)
    await jugar(db, BETO, '2026-10-10T10:00:00-03:00', 5)
    await jugar(db, CAMI, '2026-10-10T10:00:00-03:00', 8)

    // 11/10 (hoy): sólo Cami (un solo jugador no da victoria). Además recupera
    // el 09/10 como desafío anterior: es posterior a la creación, así que suma.
    await fijarAhora(db, '2026-10-11T12:00:00-03:00')
    await jugar(db, CAMI, '2026-10-11T10:00:00-03:00', 8)
    await jugar(db, CAMI, '2026-10-11T11:00:00-03:00', 8, '2026-10-09')
  })

  const ranking = (playerid = ANA) => rpc<Ranking>(db, 'ranking_sala', { p_codigo: codigo, p_playerid: playerid })

  it('suma una partida por persona y día desde que existe la sala, incluidos los desafíos anteriores', async () => {
    const { tabla } = await ranking()
    const por = Object.fromEntries(tabla.map((f) => [f.alias, f]))

    // La repetición de Beto del 09/10 no suma; el 08/10 de Cami (antes de la sala) tampoco.
    expect(por.Ana).toMatchObject({ puntos: 13, partidas: 2, victorias: 0, porcentaje: 81.3 })
    expect(por.Beto).toMatchObject({ puntos: 11, partidas: 2, victorias: 0 })
    // Cami: 09/10 (recuperado) + 10/10 + 11/10. Gana el 09/10 y el 10/10.
    expect(por.Cami).toMatchObject({ puntos: 24, partidas: 3, victorias: 2, jugo_hoy: true })
  })

  it('ordena por puntos y marca al jugador actual', async () => {
    const { tabla } = await ranking(BETO)

    expect(tabla.map((f) => [f.posicion, f.alias])).toEqual([[1, 'Cami'], [2, 'Ana'], [3, 'Beto']])
    expect(tabla.filter((f) => f.es_actual).map((f) => f.alias)).toEqual(['Beto'])
    expect(JSON.stringify(tabla)).not.toMatch(/dispositivo/)
  })

  it('la actividad muestra el desafío anterior como tal', async () => {
    const { actividad } = await ranking()
    expect(actividad[0]).toMatchObject({ alias: 'Cami', es_anterior: true, fecha: '2026-10-09' })
  })

  it('varios dispositivos de una persona son una sola fila', async () => {
    await db.exec(`insert into player_aliases (playerid, alias, grupo) values ('ana-notebook-001', null, '${ANA}')`)
    await jugar(db, 'ana-notebook-001', '2026-10-11T11:30:00-03:00', 5)

    const { tabla } = await ranking()
    expect(tabla.filter((f) => f.alias === 'Ana')).toHaveLength(1)
    expect(tabla.find((f) => f.alias === 'Ana')).toMatchObject({ puntos: 18, partidas: 3 })
  })

  it('mis salas muestra la posición', async () => {
    const salas = await rpc<{ salas: { codigo: string; mi_posicion: number; integrantes: number }[] }>(db, 'mis_salas', {
      p_playerid: BETO,
    })
    expect(salas.salas).toEqual([expect.objectContaining({ codigo, mi_posicion: 3, integrantes: 3 })])
  })
})

describe('fecha de creación de la sala', () => {
  // La sala se crea el 10/10. Beto se une el 12/10 y recupera días anteriores.
  let db: PGlite
  let codigo: string

  beforeAll(async () => {
    db = await base()
    await fijarAhora(db, '2026-10-10T09:00:00-03:00')
    codigo = (await crear(db, ANA, 'Desde el 10')).codigo!

    await fijarAhora(db, '2026-10-11T09:00:00-03:00')
    await rpc(db, 'unirse_sala', { p_codigo: codigo, p_playerid: CAMI })
    await jugar(db, CAMI, '2026-10-11T10:00:00-03:00', 3)

    await fijarAhora(db, '2026-10-12T12:00:00-03:00')
    await rpc(db, 'unirse_sala', { p_codigo: codigo, p_playerid: BETO })
    await jugar(db, BETO, '2026-10-12T10:00:00-03:00', 5, '2026-10-09')
    await jugar(db, BETO, '2026-10-12T10:10:00-03:00', 6, '2026-10-10')
    await jugar(db, BETO, '2026-10-12T10:20:00-03:00', 7, '2026-10-11')
  })

  const fila = async (alias: string) =>
    (await rpc<Ranking>(db, 'ranking_sala', { p_codigo: codigo, p_playerid: ANA })).tabla.find((f) => f.alias === alias)

  it('quien se une tarde suma los días desde la creación (inclusive), no los anteriores', async () => {
    // 09/10 no (antes de la sala); 10/10 y 11/10 sí, aunque se unió el 12/10.
    expect(await fila('Beto')).toMatchObject({ puntos: 13, partidas: 2 })
  })

  it('un día ya contado no se puede volver a sumar', async () => {
    await expect(jugar(db, BETO, '2026-10-12T11:00:00-03:00', 8, '2026-10-10')).rejects.toThrow(/desafio-ya-jugado/)
    expect(await fila('Beto')).toMatchObject({ puntos: 13, partidas: 2 })
  })

  it('la regla es la misma para los miembros originales', async () => {
    expect(await fila('Cami')).toMatchObject({ puntos: 3, partidas: 1 })
    // 11/10: Beto 7 contra Cami 3 → la victoria es de Beto, aunque lo jugó después.
    expect(await fila('Beto')).toMatchObject({ victorias: 1 })
  })

  it('la partida que no suma a la sala sigue guardada con su fecha (cuenta en los rankings generales)', async () => {
    const { rows } = await db.query<{ fecha: string }>(
      `select to_char(fecha_desafio, 'YYYY-MM-DD') fecha from game_sessions where playerid = $1 order by fecha_desafio`,
      [BETO]
    )
    expect(rows.map((r) => r.fecha)).toEqual(['2026-10-09', '2026-10-10', '2026-10-11'])
  })
})

describe('administrar la sala', () => {
  it('sólo el dueño elimina; si se va, la hereda el más antiguo; sin nadie, se borra', async () => {
    const db = await base()
    const { codigo } = await crear(db, ANA, 'Original')
    await rpc(db, 'unirse_sala', { p_codigo: codigo, p_playerid: BETO })
    await fijarAhora(db, '2026-10-09T10:00:00-03:00')
    await rpc(db, 'unirse_sala', { p_codigo: codigo, p_playerid: CAMI })

    expect((await rpc<Estado>(db, 'eliminar_sala', { p_codigo: codigo, p_playerid: CAMI })).estado).toBe('no-autorizado')

    await rpc(db, 'salir_sala', { p_codigo: codigo, p_playerid: ANA })
    expect((await rpc<Ranking>(db, 'ranking_sala', { p_codigo: codigo, p_playerid: BETO })).sala.soy_propietario).toBe(true)

    await rpc(db, 'salir_sala', { p_codigo: codigo, p_playerid: BETO })
    await rpc(db, 'salir_sala', { p_codigo: codigo, p_playerid: CAMI })
    expect((await rpc<Estado>(db, 'ver_sala', { p_codigo: codigo, p_playerid: ANA })).estado).toBe('no-existe')

    const otra = (await crear(db, ANA, 'Para borrar')).codigo
    expect((await rpc<Estado>(db, 'eliminar_sala', { p_codigo: otra, p_playerid: ANA })).estado).toBe('ok')
    expect((await rpc<Estado>(db, 'ver_sala', { p_codigo: otra, p_playerid: ANA })).estado).toBe('no-existe')
  })
})
