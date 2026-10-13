import { describe, expect, it } from 'vitest'

import { celdasDelMes, estadoDelDia, mesAnterior, mesesEntre, tituloMes } from './calendario'
import type { DiaArchivo } from './calendario'

describe('armado de meses', () => {
  it('octubre de 2026 empieza un jueves (columna J, con domingo primero)', () => {
    const celdas = celdasDelMes('2026-10')

    expect(celdas.slice(0, 4)).toEqual([null, null, null, null])
    expect(celdas[4]).toBe('2026-10-01')
    expect(celdas.filter(Boolean)).toHaveLength(31)
  })

  it('respeta los años bisiestos', () => {
    expect(celdasDelMes('2028-02').filter(Boolean)).toHaveLength(29)
    expect(celdasDelMes('2027-02').filter(Boolean)).toHaveLength(28)
  })

  it('nombra los meses en castellano', () => {
    expect(tituloMes('2026-10')).toBe('Octubre 2026')
    expect(tituloMes('2027-01')).toBe('Enero 2027')
  })

  it('recorre los meses hacia atrás cruzando el año', () => {
    expect(mesAnterior('2027-01')).toBe('2026-12')
    expect(mesesEntre('2027-01-15', '2026-11')).toEqual(['2027-01', '2026-12', '2026-11'])
  })

  it('nunca muestra meses anteriores al inicio del archivo (agosto de 2026)', () => {
    expect(mesesEntre('2026-10-12', '2026-01')).toEqual(['2026-10', '2026-09', '2026-08'])
  })
})

describe('estado de cada día', () => {
  const hoy = '2026-10-12'
  const archivo = new Map<string, DiaArchivo>([
    ['2026-10-11', { jugada: false, jugadaEnVivo: false, correctas: null, total: null }],
    ['2026-10-10', { jugada: true, jugadaEnVivo: true, correctas: 6, total: 8 }],
    ['2026-10-09', { jugada: false, jugadaEnVivo: false, correctas: null, total: null }],
  ])
  const enCurso = (fecha: string) => fecha === '2026-10-09'
  const estado = (fecha: string) => estadoDelDia(fecha, hoy, archivo, enCurso)

  it('distingue los seis estados', () => {
    expect(estado('2026-10-11').estado).toBe('disponible')
    expect(estado('2026-10-10').estado).toBe('completado')
    expect(estado('2026-10-09').estado).toBe('en-curso')
    expect(estado('2026-10-12').estado).toBe('hoy')
    expect(estado('2026-10-13').estado).toBe('futuro')
    expect(estado('2026-10-08').estado).toBe('sin-desafio')
  })

  it('sólo numera los días que tuvieron desafío', () => {
    expect(estado('2026-10-11').numero).toBe(97)
    expect(estado('2026-10-12').numero).toBe(98)
    expect(estado('2026-10-13').numero).toBeNull()
    expect(estado('2026-10-08').numero).toBeNull()
  })

  it('un día completado no queda "en curso" aunque haya progreso local', () => {
    expect(estadoDelDia('2026-10-10', hoy, archivo, () => true).estado).toBe('completado')
  })
})
