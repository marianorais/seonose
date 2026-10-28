// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'

import { textoResultado } from './compartir'
import { CLAVE_HISTORIAL_RESULTADOS, calcularRacha } from './quizHelpers'

describe('texto para compartir', () => {
  it('invita a competir, marca el canal y no revela respuestas', () => {
    const texto = textoResultado({ numero: 110, aciertos: [true, false, true] }, 'whatsapp')

    expect(texto).toContain('SEoNOSE #110 · 2/3')
    expect(texto).toContain('🟩🟥🟩')
    expect(texto).toContain('¿Podés superarme?')
    expect(texto).toMatch(/👉 http:\/\/localhost(:\d+)?\/\?c=wa$/)
  })

  it('con puntaje perfecto invita a igualar', () => {
    expect(textoResultado({ numero: 1, aciertos: [true, true] }, 'copiar')).toContain('¡Perfecto! ¿Podés igualarme?')
  })

  it('un desafío anterior lleva a ese mismo desafío', () => {
    const texto = textoResultado({ numero: 94, aciertos: [true], fechaAnterior: '2026-10-08' }, 'nativo')

    expect(texto).toContain('📅 Desafío del jueves, 8 de octubre')
    expect(texto).toMatch(/\/anteriores\/2026-10-08\?c=n$/)
  })
})

describe('racha de días seguidos', () => {
  const partida = (fechaArgentina: string, extra: Record<string, unknown> = {}) => ({
    // 15:00 UTC = 12:00 en Argentina: cae en ese día sin importar el huso del test.
    date: `${fechaArgentina}T15:00:00.000Z`,
    total: 8,
    correct: 5,
    ...extra,
  })

  const guardar = (historial: unknown[]) =>
    window.localStorage.setItem(CLAVE_HISTORIAL_RESULTADOS, JSON.stringify(historial))

  beforeEach(() => window.localStorage.clear())

  it('cuenta los días consecutivos hasta hoy', () => {
    guardar([partida('2026-10-20'), partida('2026-10-22'), partida('2026-10-23'), partida('2026-10-24')])
    expect(calcularRacha('2026-10-24')).toBe(3)
  })

  it('si hoy todavía no jugó, la racha de ayer sigue viva', () => {
    guardar([partida('2026-10-22'), partida('2026-10-23')])
    expect(calcularRacha('2026-10-24')).toBe(2)
  })

  it('los desafíos anteriores no suman y sin historial es cero', () => {
    expect(calcularRacha('2026-10-24')).toBe(0)
    guardar([partida('2026-10-23', { anterior: true }), partida('2026-10-24')])
    expect(calcularRacha('2026-10-24')).toBe(1)
  })
})
