import { describe, expect, it } from 'vitest'

import { comoAnon, crearBase } from './base'

const DENEGADO = /permission denied|row-level security/

/** Lo que hace el frontend publicado hoy al terminar una partida. */
const guardarComoFrontendViejo = async (db: Awaited<ReturnType<typeof crearBase>>, playerid: string) => {
  const { rows } = await comoAnon<{ id: number }>(
    db,
    `insert into game_sessions (startedat, completedat, totalquestions, correctanswers, playerid)
     values (now(), now(), 8, 5, $1) returning id`,
    [playerid]
  )

  await comoAnon(
    db,
    `insert into game_answers (gamesessionid, questionid, selectedanswer, correctanswer, iscorrect, responsetime)
     values ($1, 1, 'x', 'y', false, 3)`,
    [rows[0].id]
  )

  return rows[0].id
}

describe('estado actual de producción (sin migraciones)', () => {
  it('cualquiera con la anon key puede borrar todas las partidas', async () => {
    const db = await crearBase({ migraciones: 0 })
    await guardarComoFrontendViejo(db, 'jugador-uno-123')

    const { affectedRows } = await comoAnon(db, 'delete from game_answers')
    await comoAnon(db, 'delete from game_sessions')

    expect(affectedRows).toBe(1)
    const { rows } = await db.query<{ n: number }>('select count(*)::int n from game_sessions')
    expect(rows[0].n).toBe(0)
  })
})

describe('01 · seguridad inmediata', () => {
  it('impide borrar o modificar partidas, respuestas y preguntas', async () => {
    const db = await crearBase({ migraciones: 1 })
    await guardarComoFrontendViejo(db, 'jugador-uno-123')

    await expect(comoAnon(db, 'delete from game_sessions')).rejects.toThrow(DENEGADO)
    await expect(comoAnon(db, 'update game_sessions set correctanswers = 8')).rejects.toThrow(DENEGADO)
    await expect(comoAnon(db, 'delete from game_answers')).rejects.toThrow(DENEGADO)
    await expect(comoAnon(db, 'delete from questions')).rejects.toThrow(DENEGADO)
    await expect(comoAnon(db, 'truncate game_sessions cascade')).rejects.toThrow(DENEGADO)
    await expect(comoAnon(db, `insert into daily_quiz (date, questionid) values ('2026-10-11', 1)`)).rejects.toThrow(
      DENEGADO
    )
    await expect(comoAnon(db, 'select * from game_sessions_backup_unificacion')).rejects.toThrow(DENEGADO)
  })

  it('rechaza partidas con un puntaje imposible', async () => {
    const db = await crearBase({ migraciones: 1 })

    await expect(
      comoAnon(
        db,
        `insert into game_sessions (startedat, completedat, totalquestions, correctanswers, playerid)
         values (now(), now(), 8, 50, 'jugador-uno-123')`
      )
    ).rejects.toThrow(DENEGADO)
  })

  it('no deja meterse en el grupo de alias de otra persona', async () => {
    const db = await crearBase({ migraciones: 1 })
    await db.exec(`insert into player_aliases (playerid, alias, grupo) values ('victima-12345', 'Ana', 'victima-12345')`)

    await expect(
      comoAnon(db, `insert into player_aliases (playerid, alias, grupo) values ('atacante-1234', 'X', 'victima-12345')`)
    ).rejects.toThrow(DENEGADO)
  })

  it('el frontend publicado hoy sigue pudiendo guardar partidas, alias y leer categorías', async () => {
    const db = await crearBase({ migraciones: 1 })

    await expect(guardarComoFrontendViejo(db, 'jugador-uno-123')).resolves.toBeGreaterThan(0)
    await expect(
      comoAnon(db, `insert into player_aliases (playerid, alias, grupo) values ('jugador-uno-123', 'Uno', 'jugador-uno-123')`)
    ).resolves.toBeDefined()

    const categorias = await comoAnon(db, 'select id, name, icon from categories')
    expect(categorias.rows).toHaveLength(2)

    // El panel de preguntas actual (sin login) todavía puede editar.
    const edicion = await comoAnon(db, `update questions set enabled = false where id = 1`)
    expect(edicion.affectedRows).toBe(1)
  })
})

describe('02 y 03 aplicadas: el sitio publicado sigue funcionando igual', () => {
  it('guarda partidas, alias, lee categorías y el panel puede editar', async () => {
    const db = await crearBase()

    await expect(guardarComoFrontendViejo(db, 'jugador-uno-123')).resolves.toBeGreaterThan(0)
    await expect(
      comoAnon(db, `insert into player_aliases (playerid, alias, grupo) values ('jugador-uno-123', 'Uno', 'jugador-uno-123')`)
    ).resolves.toBeDefined()
    expect((await comoAnon(db, 'select id, answer from questions')).rows).toHaveLength(40)
    expect((await comoAnon(db, 'select playerid, alias from player_aliases')).rows).toHaveLength(1)
    expect((await comoAnon(db, `update questions set enabled = false where id = 1`)).affectedRows).toBe(1)
    expect((await comoAnon(db, `update game_settings set secondsperquestion = 30 where id = 1`)).affectedRows).toBe(1)
  })

  it('sigue sin poder borrarse nada', async () => {
    const db = await crearBase()
    await expect(comoAnon(db, 'delete from game_sessions')).rejects.toThrow(DENEGADO)
    await expect(comoAnon(db, 'delete from questions')).rejects.toThrow(DENEGADO)
  })
})
