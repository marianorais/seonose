import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { crearBase, MIGRACIONES } from './base'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))

describe('configuración de preguntas diarias', () => {
  it('restaura a 8 las partidas diarias configuradas anteriormente en 5', async () => {
    const db = await crearBase({ migraciones: MIGRACIONES.length - 1 })

    await db.exec('update public.game_settings set questionspergame = 5')
    await db.exec(
      readFileSync(
        `${RAIZ}/migrations/20261107000100_restaurar_ocho_preguntas.sql`,
        'utf8'
      )
    )

    const { rows } = await db.query<{ questionspergame: number }>(
      'select questionspergame from public.game_settings where id = 1'
    )

    expect(rows[0].questionspergame).toBe(8)
  })
})
