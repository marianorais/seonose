// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Supabase simulado: registra los filtros de cada consulta a game_sessions.
const filtros: string[][] = []

vi.mock('./supabase', () => {
  const consulta = (tabla: string) => {
    const usados: string[] = []
    if (tabla === 'game_sessions') filtros.push(usados)

    const cadena = {
      select: () => cadena,
      gte: () => cadena,
      lt: () => cadena,
      in: () => cadena,
      limit: () => cadena,
      eq: (columna: string, valor: unknown) => {
        usados.push(`${columna}=${String(valor)}`)
        return cadena
      },
      then: (resolver: (valor: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolver),
    }

    return cadena
  }

  return { supabase: { from: consulta, rpc: vi.fn(async () => ({ data: null, error: null })) } }
})

const { obtenerRanking } = await import('./rankingHelpers')

beforeEach(() => {
  filtros.length = 0
  window.localStorage.clear()
})

describe('desafíos anteriores en el ranking', () => {
  it('no suman al ranking de Hoy', async () => {
    await obtenerRanking('diario')
    expect(filtros[0]).toContain('es_anterior=false')
  })

  it('suman al ranking del Mes y del Año', async () => {
    await obtenerRanking('mensual')
    await obtenerRanking('anual')
    expect(filtros.every((usados) => !usados.includes('es_anterior=false'))).toBe(true)
  })
})
