import { describe, expect, it } from 'vitest'

import {
  construirTextoInvitacion,
  construirTextoRanking,
  esCodigoSalaValido,
  extraerCodigoSala,
  ordenarTablaSala,
  validarNombreSala,
} from './salas'
import type { FilaSala } from './salas'

const fila = (datos: Partial<FilaSala>): FilaSala => ({
  clave: 'p000000000000',
  alias: 'Alguien',
  puntos: 0,
  partidas: 0,
  correctas: 0,
  total: 0,
  victorias: 0,
  porcentaje: 0,
  posicion: 1,
  jugoHoy: false,
  esActual: false,
  ...datos,
})

describe('validarNombreSala', () => {
  it('acepta un nombre normal y le saca los espacios de más', () => {
    expect(validarNombreSala('  Los   del  fútbol ')).toEqual({ ok: true, nombre: 'Los del fútbol' })
  })

  it('rechaza vacío, sólo espacios, largo y símbolos peligrosos', () => {
    expect(validarNombreSala('')).toEqual({ ok: false, error: 'vacio' })
    expect(validarNombreSala('     ')).toEqual({ ok: false, error: 'vacio' })
    expect(validarNombreSala('x'.repeat(41))).toEqual({ ok: false, error: 'largo' })
    expect(validarNombreSala('<b>Sala</b>')).toEqual({ ok: false, error: 'caracteres' })
  })

  it('acepta emojis y exactamente 40 caracteres', () => {
    expect(validarNombreSala('Familia 🧉').ok).toBe(true)
    expect(validarNombreSala('x'.repeat(40)).ok).toBe(true)
  })
})

describe('extraerCodigoSala', () => {
  it('saca el código de un link completo, como llega por WhatsApp', () => {
    expect(extraerCodigoSala('https://www.seonose.com.ar/sala/abcd2345xy')).toBe('abcd2345xy')
    expect(extraerCodigoSala('Mirá: seonose.com.ar/sala/ABCD2345XY?x=1')).toBe('abcd2345xy')
  })

  it('acepta el código solo y rechaza cualquier otra cosa', () => {
    expect(extraerCodigoSala(' abcd2345xy ')).toBe('abcd2345xy')
    expect(extraerCodigoSala('abc')).toBeNull()
    expect(extraerCodigoSala('abcd2345x0')).toBeNull() // el 0 no está en el alfabeto
    expect(extraerCodigoSala('https://otro.com/algo')).toBeNull()
  })

  it('valida códigos', () => {
    expect(esCodigoSalaValido('abcd2345xy')).toBe(true)
    expect(esCodigoSalaValido('abcd2345xl')).toBe(false)
    expect(esCodigoSalaValido(undefined)).toBe(false)
  })
})

describe('textos para compartir', () => {
  it('la invitación lleva el nombre y el link', () => {
    const texto = construirTextoInvitacion('Oficina', 'https://x/sala/abcd2345xy')
    expect(texto).toContain('"Oficina"')
    expect(texto).toContain('https://x/sala/abcd2345xy')
  })

  it('el ranking comparte sólo el podio, con alias y puntos', () => {
    const tabla = [
      fila({ alias: 'Ana', puntos: 13 }),
      fila({ alias: 'Beto', puntos: 11 }),
      fila({ alias: 'Cami', puntos: 1 }),
      fila({ alias: 'Dani', puntos: 0 }),
    ]

    const texto = construirTextoRanking('Facu', tabla, 'https://x/sala/abcd2345xy')

    expect(texto).toContain('🥇 Ana · 13 pts')
    expect(texto).toContain('🥉 Cami · 1 pt')
    expect(texto).not.toContain('Dani')
  })
})

describe('ordenarTablaSala', () => {
  const tabla = [
    fila({ clave: 'a', alias: 'Ana', puntos: 13, victorias: 1, partidas: 2, porcentaje: 81.3, posicion: 1 }),
    fila({ clave: 'b', alias: 'Beto', puntos: 11, victorias: 3, partidas: 2, porcentaje: 68.8, posicion: 2 }),
    fila({ clave: 'c', alias: 'Cami', puntos: 8, victorias: 1, partidas: 1, porcentaje: 100, posicion: 3 }),
    fila({ clave: 'd', alias: 'Dani', posicion: 4 }),
  ]

  it('puntos respeta la posición oficial del servidor', () => {
    expect(ordenarTablaSala(tabla, 'puntos').map((f) => [f.puesto, f.alias])).toEqual([
      [1, 'Ana'],
      [2, 'Beto'],
      [3, 'Cami'],
      [4, 'Dani'],
    ])
  })

  it('victorias ordena por victorias y desempata por puntos', () => {
    expect(ordenarTablaSala(tabla, 'victorias').map((f) => f.alias)).toEqual(['Beto', 'Ana', 'Cami', 'Dani'])
  })

  it('porcentaje deja afuera a quien no jugó', () => {
    expect(ordenarTablaSala(tabla, 'porcentaje').map((f) => f.alias)).toEqual(['Cami', 'Ana', 'Beto'])
  })
})
