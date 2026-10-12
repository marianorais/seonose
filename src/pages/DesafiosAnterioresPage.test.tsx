// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
}))

const { default: DesafiosAnterioresPage } = await import('./DesafiosAnterioresPage')

const dia = (fecha: string, estado: string, extra: Record<string, unknown> = {}) => ({
  fecha,
  jugada: estado === 'completada',
  jugada_en_vivo: false,
  correctas: null,
  total: null,
  ...extra,
})

const renderizar = () =>
  render(
    <MemoryRouter>
      <DesafiosAnterioresPage />
    </MemoryRouter>
  )

beforeEach(() => {
  rpc.mockReset()
  window.localStorage.clear()
})

afterEach(() => cleanup())

describe('desafíos anteriores', () => {
  it('muestra cada fecha con su estado en texto (no sólo color) y la acción que corresponde', async () => {
    // Partida a medias en este navegador: se ofrece continuarla.
    window.localStorage.setItem('seonose-quiz-state-anterior-2026-10-09', JSON.stringify({ dayKey: '2026-10-09', currentIndex: 2 }))
    rpc.mockResolvedValue({
      data: {
        hay_mas: false,
        fechas: [
          dia('2026-10-10', 'disponible'),
          dia('2026-10-09', 'disponible'),
          dia('2026-10-08', 'completada', { correctas: 6, total: 8 }),
          dia('2026-10-07', 'completada', { jugada_en_vivo: true, correctas: 4, total: 8 }),
        ],
      },
      error: null,
    })

    renderizar()

    expect(await screen.findByText('Disponible')).toBeTruthy()
    expect(screen.getByText('En curso')).toBeTruthy()
    expect(screen.getByText('Completado')).toBeTruthy()
    expect(screen.getByText('Lo jugaste ese día')).toBeTruthy()
    expect(screen.getByText('6/8')).toBeTruthy()

    expect(screen.getByRole('link', { name: /Jugar el desafío del sábado, 10 de octubre/ }).getAttribute('href')).toBe(
      '/anteriores/2026-10-10'
    )
    expect(screen.getByRole('link', { name: /Continuar el desafío/ })).toBeTruthy()
    // Los completados no tienen botón para jugar de nuevo.
    expect(screen.getAllByRole('link', { name: /(Jugar|Continuar) el desafío/ })).toHaveLength(2)
    expect(screen.getByText(/Tenés 2 desafíos para jugar/)).toBeTruthy()
  })

  it('pagina con "Ver días más viejos" a partir de la última fecha', async () => {
    rpc
      .mockResolvedValueOnce({ data: { hay_mas: true, fechas: [dia('2026-10-10', 'disponible')] }, error: null })
      .mockResolvedValueOnce({ data: { hay_mas: false, fechas: [dia('2026-10-09', 'disponible')] }, error: null })

    renderizar()

    fireEvent.click(await screen.findByRole('button', { name: 'Ver días más viejos' }))

    await waitFor(() => expect(screen.getAllByText('Disponible')).toHaveLength(2))
    expect(rpc.mock.calls[1][1]).toMatchObject({ p_antes_de: '2026-10-10' })
    expect(screen.queryByRole('button', { name: 'Ver días más viejos' })).toBeNull()
  })

  it('error de conexión con reintento, y lista vacía con mensaje', async () => {
    rpc.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    rpc.mockResolvedValueOnce({ data: { hay_mas: false, fechas: [] }, error: null })

    renderizar()

    fireEvent.click(await screen.findByRole('button', { name: 'Probar de nuevo' }))

    expect(await screen.findByText('Todavía no hay desafíos anteriores')).toBeTruthy()
  })
})
