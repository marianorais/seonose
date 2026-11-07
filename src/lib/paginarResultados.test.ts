import { describe, expect, it, vi } from 'vitest'

import { cargarTodasLasPaginas } from './paginarResultados'

describe('cargarTodasLasPaginas', () => {
  it('continúa consultando páginas hasta llegar a las últimas filas', async () => {
    const cargarPagina = vi.fn(async (desde: number) => {
      if (desde === 0) {
        return { data: Array.from({ length: 1000 }, (_, id) => id), error: null }
      }

      if (desde === 1000) {
        return { data: [1000, 1001], error: null }
      }

      return { data: [], error: null }
    })

    const filas = await cargarTodasLasPaginas(cargarPagina)

    expect(filas).toHaveLength(1002)
    expect(filas[0]).toBe(0)
    expect(filas.at(-1)).toBe(1001)
    expect(cargarPagina).toHaveBeenCalledTimes(2)
    expect(cargarPagina).toHaveBeenNthCalledWith(1, 0, 999)
    expect(cargarPagina).toHaveBeenNthCalledWith(2, 1000, 1999)
  })

  it('propaga errores en lugar de devolver un resultado parcial', async () => {
    const error = new Error('falló la consulta')
    const cargarPagina = vi.fn(async () => ({ data: null, error }))

    await expect(cargarTodasLasPaginas(cargarPagina)).rejects.toBe(error)
  })
})
