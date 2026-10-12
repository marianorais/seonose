import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { comoAnon, crearBase } from './base'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const leer = (ruta: string) => readFileSync(`${RAIZ}${ruta}`, 'utf8')
const migracion = (numero: string) =>
  leer(
    numero === '4'
      ? 'tests/aplicadas_por_error/20261012000400_administracion.sql'
      : 'tests/aplicadas_por_error/20261012000500_endurecimiento.sql'
  )
const REVERSION = leer('reversion/revertir_04_y_05.sql')

/** Todo lo que hace el sitio publicado hoy, como anon. */
const usarSitioPublicado = async (db: PGlite) => {
  // El juego lee preguntas y categorías.
  expect((await comoAnon(db, 'select id, answer from questions')).rows.length).toBe(40)
  await comoAnon(db, 'select * from categories')
  await comoAnon(db, 'select * from game_settings')

  // Guarda la partida y sus respuestas.
  const { rows } = await comoAnon<{ id: number }>(
    db,
    `insert into game_sessions (startedat, completedat, totalquestions, correctanswers, playerid)
     values (now(), now(), 8, 5, 'jugador-publicado') returning id`
  )
  await comoAnon(
    db,
    `insert into game_answers (gamesessionid, questionid, selectedanswer, correctanswer, iscorrect, responsetime)
     values ($1, 1, 'x', 'y', false, 3)`,
    [rows[0].id]
  )
  await comoAnon(db, `select public.reclamar_partida(${rows[0].id}, 'jugador-publicado')`)

  // El ranking lee partidas, respuestas y alias; el jugador elige alias.
  await comoAnon(db, 'select id, playerid, correctanswers from game_sessions')
  await comoAnon(db, 'select gamesessionid, responsetime from game_answers')
  await comoAnon(db, `insert into player_aliases (playerid, alias, grupo) values ('jugador-publicado', 'Pub', 'jugador-publicado')`)
  expect((await comoAnon(db, 'select playerid, alias, grupo from player_aliases')).rows.length).toBe(1)

  // Panel de preguntas y configuración, sin login.
  expect((await comoAnon(db, `update questions set enabled = false where id = 1`)).affectedRows).toBe(1)
  expect((await comoAnon(db, `insert into questions (question, answer) values ('Nueva', 'Sí')`)).affectedRows).toBe(1)
  expect((await comoAnon(db, `update game_settings set secondsperquestion = 30 where id = 1`)).affectedRows).toBe(1)

  // Formulario de contacto y /mejoras.
  await comoAnon(db, `insert into mejoras (texto) values ('Idea')`)
  expect((await comoAnon(db, 'select texto from mejoras')).rows.length).toBe(1)
}

/** Lo que la 01 cerró tiene que seguir cerrado. */
const sigueProtegido = async (db: PGlite) => {
  await expect(comoAnon(db, 'delete from game_sessions')).rejects.toThrow(/permission denied/)
  await expect(comoAnon(db, 'update game_sessions set correctanswers = 8')).rejects.toThrow(/permission denied/)
  await expect(comoAnon(db, 'delete from questions')).rejects.toThrow(/permission denied/)
}

describe('revertir 04 y 05', () => {
  it('con 01, 04 y 05 aplicadas (sin 02 ni 03): el sitio publicado vuelve a funcionar', async () => {
    const db = await crearBase({ migraciones: 1 })
    await db.exec(migracion('4'))
    await db.exec(migracion('5'))

    // Así estaba roto.
    await expect(comoAnon(db, 'select answer from questions')).rejects.toThrow(/permission denied/)

    await db.exec(REVERSION)

    await usarSitioPublicado(db)
    await sigueProtegido(db)
  })

  it('con las 5 aplicadas: el sitio publicado vuelve a funcionar y las funciones nuevas siguen', async () => {
    const db = await crearBase()
    await db.exec(REVERSION)

    await usarSitioPublicado(db)
    await sigueProtegido(db)
  })

  it('se puede correr dos veces, y después volver a aplicar 04 y 05 al publicar', async () => {
    const db = await crearBase()
    await db.exec(REVERSION)
    await db.exec(REVERSION)

    await db.exec(migracion('4'))
    await db.exec(migracion('5'))

    await expect(comoAnon(db, 'select answer from questions')).rejects.toThrow(/permission denied/)
  })
})
