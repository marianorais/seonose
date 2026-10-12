import type { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

import { comoAnon, crearBase, fijarAhora, guardarPartida, rpc } from './base'

/** 15:00 en Argentina del 11/10/2026. */
const AHORA = '2026-10-11T15:00:00-03:00'
const YO = 'yo-dispositivo-0001'

/** 8 preguntas distintas para el día k (0 = 05/10). */
const conjunto = (k: number) => [2 * k + 1, 2 * k + 2, 17 + k, 18 + k, 19 + k, 20 + k, 21 + k, 22 + k]
const fechaDelDia = (k: number) => `2026-10-${String(5 + k).padStart(2, '0')}`

/** Seis días jugados en el sitio de siempre, con ruido realista. */
const historial = async (db: PGlite) => {
  for (let k = 0; k <= 5; k += 1) {
    const fecha = fechaDelDia(k)
    await guardarPartida(db, { playerid: `otro-${k}-aaaa`, completedat: `${fecha}T12:00:00-03:00`, ids: conjunto(k), correctas: 5 })
    await guardarPartida(db, { playerid: `otro-${k}-bbbb`, completedat: `${fecha}T13:00:00-03:00`, ids: conjunto(k), correctas: 6 })
    // Preguntas de demostración (falló la conexión): no definen el día.
    await guardarPartida(db, { playerid: 'demo-jugador', completedat: `${fecha}T14:00:00-03:00`, ids: [1, 2, 3, 4, 5], correctas: 3 })
  }

  // Yo jugué el 10/10 en el sitio de siempre.
  await guardarPartida(db, { playerid: YO, completedat: '2026-10-10T10:00:00-03:00', ids: conjunto(5), correctas: 4 })
}

describe('el sitio de siempre sigue funcionando igual', () => {
  it('guarda partidas y la fecha se completa sola en hora argentina', async () => {
    const db = await crearBase()
    await fijarAhora(db, AHORA)

    // 23:50 del 10/10 en Argentina = 02:50 UTC del 11/10.
    const partida = await guardarPartida(db, { playerid: 'nocturno-1234', completedat: '2026-10-11T02:50:00Z', ids: conjunto(0) })

    expect(partida).toMatchObject({ fecha_desafio: '2026-10-10', es_anterior: false })
  })

  it('completa la fecha de las partidas que ya existían', async () => {
    const db = await crearBase({
      antesDeMigrar: async (base) => {
        await base.exec(`insert into game_sessions (startedat, completedat, totalquestions, correctanswers, playerid)
                         values ('2026-09-01T23:30:00-03:00', '2026-09-01T23:30:00-03:00', 8, 3, 'viejo-123456')`)
      },
    })

    const { rows } = await db.query<{ fecha: string }>(`select to_char(fecha_desafio, 'YYYY-MM-DD') fecha from game_sessions`)
    expect(rows[0].fecha).toBe('2026-09-01')
  })

  it('no se puede disfrazar una partida de hoy con otra fecha', async () => {
    const db = await crearBase()
    await fijarAhora(db, AHORA)

    const { rows } = await comoAnon<{ fecha: string }>(
      db,
      `insert into game_sessions (startedat, completedat, totalquestions, correctanswers, playerid, fecha_desafio)
       values (now(), '2026-10-11T12:00:00-03:00', 8, 8, 'tramposo-1234', '2026-01-01')
       returning to_char(fecha_desafio, 'YYYY-MM-DD') fecha`
    )
    expect(rows[0].fecha).toBe('2026-10-11')
  })
})

describe('preguntas de un día anterior', () => {
  let db: PGlite

  beforeAll(async () => {
    db = await crearBase()
    await fijarAhora(db, AHORA)
    await historial(db)
  })

  it('son las que se jugaron ese día, en el mismo orden', async () => {
    const desafio = await rpc<{ fecha: string; segundos_por_pregunta: number; preguntas: { id: number; answer: string }[] }>(
      db,
      'obtener_desafio_anterior',
      { p_fecha: '2026-10-08' }
    )

    expect(desafio.preguntas.map((p) => p.id)).toEqual(conjunto(3))
    expect(desafio.preguntas[0].answer).toBe('Respuesta 7')
    expect(desafio.segundos_por_pregunta).toBe(30)
  })

  it('no hay desafío para hoy, el futuro, antes del 05/08 ni días sin partidas', async () => {
    for (const fecha of ['2026-10-11', '2026-10-12', '2026-07-20', '2026-10-01']) {
      expect(await rpc(db, 'obtener_desafio_anterior', { p_fecha: fecha })).toBeNull()
    }
  })
})

describe('lista de desafíos anteriores', () => {
  let db: PGlite

  beforeAll(async () => {
    db = await crearBase()
    await fijarAhora(db, AHORA)
    await historial(db)
  })

  interface Lista {
    hay_mas: boolean
    fechas: { fecha: string; jugada: boolean; jugada_en_vivo: boolean; correctas: number | null }[]
  }

  it('del más reciente al más viejo, sin hoy, con paginación', async () => {
    const primera = await rpc<Lista>(db, 'desafios_anteriores', { p_playerid: 'nuevo-jugador1', p_limite: 4 })

    expect(primera.fechas.map((f) => f.fecha)).toEqual(['2026-10-10', '2026-10-09', '2026-10-08', '2026-10-07'])
    expect(primera.hay_mas).toBe(true)
    expect(primera.fechas.every((f) => !f.jugada)).toBe(true)

    const segunda = await rpc<Lista>(db, 'desafios_anteriores', { p_playerid: 'nuevo-jugador1', p_limite: 4, p_antes_de: '2026-10-07' })
    expect(segunda.fechas.map((f) => f.fecha)).toEqual(['2026-10-06', '2026-10-05'])
    expect(segunda.hay_mas).toBe(false)
  })

  it('un día jugado en vivo figura como jugado, con su resultado', async () => {
    const lista = await rpc<Lista>(db, 'desafios_anteriores', { p_playerid: YO })
    expect(lista.fechas[0]).toMatchObject({ fecha: '2026-10-10', jugada: true, jugada_en_vivo: true, correctas: 4 })
  })
})

describe('jugar un desafío anterior', () => {
  let db: PGlite

  beforeAll(async () => {
    db = await crearBase()
    await fijarAhora(db, AHORA)
    await historial(db)
  })

  it('se guarda una vez; la segunda vez la base lo rechaza', async () => {
    const partida = await guardarPartida(db, {
      playerid: 'historico-0001', completedat: '2026-10-11T14:00:00-03:00', ids: conjunto(3), correctas: 6, anterior: '2026-10-08',
    })
    expect(partida).toMatchObject({ fecha_desafio: '2026-10-08', es_anterior: true })

    await expect(
      guardarPartida(db, { playerid: 'historico-0001', completedat: '2026-10-11T14:05:00-03:00', ids: conjunto(3), anterior: '2026-10-08' })
    ).rejects.toThrow(/desafio-ya-jugado|duplicate key/)

    const lista = await rpc<{ fechas: { fecha: string; jugada: boolean; jugada_en_vivo: boolean }[] }>(db, 'desafios_anteriores', {
      p_playerid: 'historico-0001',
    })
    expect(lista.fechas.find((f) => f.fecha === '2026-10-08')).toMatchObject({ jugada: true, jugada_en_vivo: false })
  })

  it('no se puede jugar como anterior un día que ya se jugó en vivo', async () => {
    await expect(
      guardarPartida(db, { playerid: YO, completedat: '2026-10-11T14:00:00-03:00', ids: conjunto(5), anterior: '2026-10-10' })
    ).rejects.toThrow(/desafio-ya-jugado/)
  })

  it('no se puede jugar como anterior hoy ni el futuro', async () => {
    for (const fecha of ['2026-10-11', '2026-10-12']) {
      await expect(
        guardarPartida(db, { playerid: 'apurado-12345', completedat: '2026-10-11T14:00:00-03:00', ids: conjunto(6), anterior: fecha })
      ).rejects.toThrow(/desafio-anterior-invalido/)
    }
  })

  it('jugar un día anterior no bloquea la partida de hoy', async () => {
    await guardarPartida(db, { playerid: 'ambos-000001', completedat: '2026-10-11T09:00:00-03:00', ids: conjunto(1), anterior: '2026-10-06' })
    const hoy = await guardarPartida(db, { playerid: 'ambos-000001', completedat: '2026-10-11T10:00:00-03:00', ids: conjunto(6) })

    expect(hoy).toMatchObject({ fecha_desafio: '2026-10-11', es_anterior: false })
  })

  it('las partidas de días anteriores no cambian las preguntas de ese día', async () => {
    const antes = await rpc<{ preguntas: { id: number }[] }>(db, 'obtener_desafio_anterior', { p_fecha: '2026-10-07' })
    await guardarPartida(db, { playerid: 'raro-0000001', completedat: '2026-10-11T11:00:00-03:00', ids: conjunto(0), anterior: '2026-10-07' })
    await guardarPartida(db, { playerid: 'raro-0000002', completedat: '2026-10-11T11:00:00-03:00', ids: conjunto(0), anterior: '2026-10-07' })
    const despues = await rpc<{ preguntas: { id: number }[] }>(db, 'obtener_desafio_anterior', { p_fecha: '2026-10-07' })

    expect(despues.preguntas).toEqual(antes.preguntas)
  })
})
