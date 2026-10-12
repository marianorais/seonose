/**
 * Base de datos de prueba: PGlite (Postgres real compilado a WebAssembly) con
 * la réplica del esquema de producción y las migraciones de
 * `supabase/migrations/` aplicadas en orden.
 *
 * Permite probar SQL, RLS, permisos y funciones sin tocar Supabase. Lo que NO
 * reproduce: concurrencia real entre conexiones (PGlite tiene una sola), la
 * capa HTTP de PostgREST ni la autenticación real de Supabase.
 */
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))

const leer = (ruta: string) => readFileSync(ruta, 'utf8')

export const MIGRACIONES = readdirSync(join(RAIZ, 'migrations'))
  .filter((archivo) => archivo.endsWith('.sql'))
  .sort()

export interface OpcionesBase {
  /** Cuántas migraciones aplicar (por defecto, todas). */
  migraciones?: number
  /** Datos a cargar ANTES de migrar (para probar los backfills). */
  antesDeMigrar?: (db: PGlite) => Promise<void>
}

export const crearBase = async ({ migraciones = MIGRACIONES.length, antesDeMigrar }: OpcionesBase = {}) => {
  const db = new PGlite()

  await db.exec(leer(join(RAIZ, 'tests', 'esquema_produccion.sql')))
  await sembrarCatalogo(db)

  if (antesDeMigrar) await antesDeMigrar(db)

  for (const archivo of MIGRACIONES.slice(0, migraciones)) {
    await db.exec(leer(join(RAIZ, 'migrations', archivo)))
  }

  return db
}

/** Fija el reloj del servidor (ver `privado.ahora()`). */
export const fijarAhora = async (db: PGlite, iso: string) => {
  await db.query(`select set_config('seonose.ahora', $1, false)`, [iso])
}

/** Ejecuta una consulta con el rol `anon`, como lo haría el navegador. */
export const comoAnon = async <T = Record<string, unknown>>(db: PGlite, sql: string, params: unknown[] = []) => {
  await db.exec('set role anon')

  try {
    return await db.query<T>(sql, params)
  } finally {
    await db.exec('reset role')
  }
}

/** Ejecuta una consulta como un usuario autenticado de Supabase. */
export const comoUsuario = async <T = Record<string, unknown>>(
  db: PGlite,
  userId: string,
  sql: string,
  params: unknown[] = []
) => {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId])
  await db.exec('set role authenticated')

  try {
    return await db.query<T>(sql, params)
  } finally {
    await db.exec('reset role')
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`)
  }
}

/**
 * Llama a una RPC como `anon`, con parámetros nombrados (igual que
 * `supabase.rpc`). Devuelve el JSON que retorna la función.
 */
export const rpc = async <T = Record<string, unknown>>(
  db: PGlite,
  nombre: string,
  argumentos: Record<string, unknown> = {}
): Promise<T> => {
  const claves = Object.keys(argumentos)
  const lista = claves.map((clave, indice) => `${clave} => $${indice + 1}`).join(', ')
  const valores = claves.map((clave) => {
    const valor = argumentos[clave]
    return valor !== null && typeof valor === 'object' && !Array.isArray(valor) ? JSON.stringify(valor) : valor
  })

  const { rows } = await comoAnon<{ r: T }>(db, `select public.${nombre}(${lista}) as r`, valores)

  return rows[0].r
}

/**
 * Catálogo base: 40 preguntas, configuración de 8 preguntas por partida.
 *  - 1..16: con fecha (2 por día del 2026-10-05 al 2026-10-12).
 *  - 17..34: sin fecha (pozo general).
 *  - 35..40: repetibles.
 */
const sembrarCatalogo = async (db: PGlite) => {
  await db.exec(`
    insert into categories (id, name, icon) values (1, 'Historia', '📜'), (2, 'Ciencia', '🔬');

    insert into game_settings (id, secondsperquestion, questionspergame) values (1, 30, 8);

    insert into questions (id, question, answer, choices, enabled, availablefrom, repeatable, categoryid)
    select g,
           'Pregunta ' || g,
           'Respuesta ' || g,
           jsonb_build_array('Respuesta ' || g, 'Otra ' || g, 'Distinta ' || g),
           true,
           case when g <= 16 then date '2026-10-05' + ((g - 1) / 2) end,
           g > 34,
           1 + (g % 2)
      from generate_series(1, 40) g;

    select setval(pg_get_serial_sequence('public.questions', 'id'), 40);
    select setval(pg_get_serial_sequence('public.game_settings', 'id'), 1);
  `)
}

/** Respuestas correctas/incorrectas para las preguntas de un desafío. */
export const armarRespuestas = (ids: number[], correctas: number) =>
  ids.map((id, indice) => ({
    questionid: id,
    respuesta: indice < correctas ? `Respuesta ${id}` : `Otra ${id}`,
    tiempo: 5,
  }))

/** Guarda una partida como lo hace la app (insert directo, como anon). */
export const guardarPartida = async (
  db: PGlite,
  datos: { playerid: string | null; completedat: string; ids: number[]; correctas?: number; anterior?: string }
) => {
  const { rows } = await comoAnon<{ id: number; fecha_desafio: string; es_anterior: boolean }>(
    db,
    `insert into game_sessions (startedat, completedat, totalquestions, correctanswers, playerid, fecha_desafio, es_anterior)
     values ($1, $1, $2, $3, $4, $5, $6)
     returning id, to_char(fecha_desafio, 'YYYY-MM-DD') as fecha_desafio, es_anterior`,
    [datos.completedat, datos.ids.length, datos.correctas ?? 0, datos.playerid, datos.anterior ?? null, Boolean(datos.anterior)]
  )

  for (const questionid of datos.ids) {
    await comoAnon(
      db,
      `insert into game_answers (gamesessionid, questionid, selectedanswer, correctanswer, iscorrect, responsetime)
       values ($1, $2, 'x', 'y', false, 4)`,
      [rows[0].id, questionid]
    )
  }

  return rows[0]
}

export const uuid = () => crypto.randomUUID()
