import { afterEach, describe, expect, it, vi } from 'vitest'

import { getTodayKey } from './appHelpers'
import { esFechaValida, formatearFechaLarga, numeroDeDesafio, sumarDias } from './fechas'
import { obtenerNumeroPartida } from './quizHelpers'

afterEach(() => {
  vi.useRealTimers()
})

describe('fechas del juego', () => {
  it('numera los desafíos desde el 07/07/2026, igual que el servidor', () => {
    expect(numeroDeDesafio('2026-07-07')).toBe(1)
    expect(numeroDeDesafio('2026-10-08')).toBe(94)
    expect(numeroDeDesafio('2026-10-11')).toBe(97)
  })

  it('suma días cruzando meses y años', () => {
    expect(sumarDias('2026-10-31', 1)).toBe('2026-11-01')
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01')
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('valida fechas de verdad', () => {
    expect(esFechaValida('2026-10-11')).toBe(true)
    expect(esFechaValida('2026-02-30')).toBe(false)
    expect(esFechaValida('11/10/2026')).toBe(false)
    expect(esFechaValida(undefined)).toBe(false)
  })

  it('formatea en castellano sin correr el día', () => {
    expect(formatearFechaLarga('2026-10-10')).toBe('sábado, 10 de octubre')
  })
})

describe('zona horaria argentina', () => {
  it('a las 23:30 de Argentina (02:30 UTC del día siguiente) sigue siendo el mismo día', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-12T02:30:00Z'))

    expect(getTodayKey()).toBe('2026-10-11')
    expect(obtenerNumeroPartida()).toBe(97)
  })

  it('a las 00:05 de Argentina ya es el desafío siguiente', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-12T03:05:00Z'))

    expect(getTodayKey()).toBe('2026-10-12')
    expect(obtenerNumeroPartida()).toBe(98)
  })
})
