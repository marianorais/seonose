// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchBoletinesActivos = vi.fn()

vi.mock('../lib/boletinesHelpers', () => ({
  fetchBoletinesActivos,
}))

const { default: BoletinInformativoPage } = await import('./BoletinInformativoPage')

const renderizar = () =>
  render(
    <MemoryRouter>
      <BoletinInformativoPage />
    </MemoryRouter>
  )

describe('Boletín Informativo', () => {
  beforeEach(() => {
    fetchBoletinesActivos.mockReset()
    window.localStorage.clear()
  })

  it('muestra los boletines activos ordenados del más reciente al más antiguo', async () => {
    fetchBoletinesActivos.mockResolvedValue([
      {
        id: 2,
        titulo: 'Actualización importante',
        descripcion: 'Detalles del nuevo cambio.',
        activo: true,
        fecha_creacion: '2026-10-10T08:00:00Z',
        fecha_actualizacion: '2026-10-10T08:00:00Z',
      },
      {
        id: 1,
        titulo: 'Mantenimiento programado',
        descripcion: 'El sistema estará caído por unos minutos.',
        activo: true,
        fecha_creacion: '2026-10-09T10:00:00Z',
        fecha_actualizacion: '2026-10-09T10:00:00Z',
      },
    ])

    renderizar()

    expect(await screen.findByRole('heading', { name: 'Boletín Informativo' })).toBeTruthy()
    expect(screen.getByText('Actualización importante')).toBeTruthy()
    expect(screen.getByText('Mantenimiento programado')).toBeTruthy()

    const titulos = Array.from(document.querySelectorAll('article h2')).map((node) => node.textContent)
    expect(titulos).toEqual(['Actualización importante', 'Mantenimiento programado'])
  })

  it('muestra un estado vacío cuando no hay novedades', async () => {
    fetchBoletinesActivos.mockResolvedValue([])

    renderizar()

    expect(await screen.findByText('Todavía no hay novedades disponibles.')).toBeTruthy()
  })
})
