// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Supabase simulado: registra los filtros de cada consulta a game_sessions y
// devuelve las partidas que pasan esos filtros.
interface Partida {
  id: number
  playerid: string
  correctanswers: number
  totalquestions: number
  userip: null
  fecha_desafio: string
  completedat: string
  es_anterior: boolean
}

let partidas: Partida[] = []
const filtros: string[][] = []

vi.mock('./supabase', () => {
  const consulta = (tabla: string) => {
    const usados: string[] = []
    const condiciones: ((fila: Record<string, unknown>) => boolean)[] = []
    if (tabla === 'game_sessions') filtros.push(usados)

    const cadena = {
      select: () => cadena,
      in: () => cadena,
      limit: () => cadena,
      gte: (columna: string, valor: string) => {
        usados.push(`${columna}>=${valor}`)
        condiciones.push((fila) => String(fila[columna]) >= valor)
        return cadena
      },
      lt: (columna: string, valor: string) => {
        usados.push(`${columna}<${valor}`)
        condiciones.push((fila) => String(fila[columna]) < valor)
        return cadena
      },
      eq: (columna: string, valor: unknown) => {
        usados.push(`${columna}=${String(valor)}`)
        condiciones.push((fila) => fila[columna] === valor)
        return cadena
      },
      then: (resolver: (valor: unknown) => unknown) => {
        const filas =
          tabla === 'game_sessions'
            ? partidas.filter((fila) => condiciones.every((condicion) => condicion(fila as unknown as Record<string, unknown>)))
            : []
        return Promise.resolve({ data: filas, error: null }).then(resolver)
      },
    }

    return cadena
  }

  return { supabase: { from: consulta, rpc: vi.fn(async () => ({ data: null, error: null })) } }
})

const { obtenerRanking } = await import('./rankingHelpers')

const partida = (id: number, fecha: string, completada: string, correctas: number, esAnterior = false): Partida => ({
  id,
  playerid: 'jugador-0001',
  correctanswers: correctas,
  totalquestions: 8,
  userip: null,
  fecha_desafio: fecha,
  completedat: completada,
  es_anterior: esAnterior,
})

beforeEach(() => {
  filtros.length = 0
  window.localStorage.clear()
  // La identidad de este navegador es la del jugador de las partidas simuladas.
  window.localStorage.setItem('seonose-player-id', 'jugador-0001')
  // Hoy: 13/10/2026 al mediodía en Argentina.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-13T15:00:00Z'))

  partidas = [
    // El desafío de hoy, jugado hoy.
    partida(1, '2026-10-13', '2026-10-13T12:00:00Z', 5),
    // El desafío de ayer, jugado HOY como desafío anterior.
    partida(2, '2026-10-12', '2026-10-13T13:00:00Z', 7, true),
    // El desafío del 30/09, jugado hoy: es de septiembre.
    partida(3, '2026-09-30', '2026-10-13T14:00:00Z', 6, true),
  ]
})

afterEach(() => {
  vi.useRealTimers()
})

const puntosDe = async (periodo: 'diario' | 'mensual' | 'anual') =>
  (await obtenerRanking(periodo)).players.find((jugador) => jugador.isCurrentPlayer)?.points ?? 0

describe('el período se decide por la fecha del desafío, no por cuándo se jugó', () => {
  it('Hoy: sólo el desafío de hoy, aunque los anteriores se hayan jugado hoy', async () => {
    expect(await puntosDe('diario')).toBe(5)
    expect(filtros[0]).toEqual(expect.arrayContaining(['fecha_desafio>=2026-10-13', 'fecha_desafio<2026-10-14']))
  })

  it('Mes: suman los desafíos de octubre; el del 30/09 queda en septiembre', async () => {
    expect(await puntosDe('mensual')).toBe(0) // mínimo de 3 partidas: no califica con 2
    const datos = await obtenerRanking('mensual')
    expect(datos.currentPlayerGames).toBe(2)
    expect(filtros.at(-1)).toEqual(expect.arrayContaining(['fecha_desafio>=2026-10-01', 'fecha_desafio<2026-11-01']))
  })

  it('Año: suman todos los desafíos de 2026', async () => {
    expect(await puntosDe('anual')).toBe(18)
  })

  it('no se filtra por la fecha en que se guardó la partida', async () => {
    await obtenerRanking('diario')
    expect(filtros.flat().some((filtro) => filtro.startsWith('completedat'))).toBe(false)
  })
})
