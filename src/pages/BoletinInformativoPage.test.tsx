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

  it('aplica negrita y enlaces Markdown sin interpretar HTML y conserva saltos de línea', async () => {
    fetchBoletinesActivos.mockResolvedValue([
      {
        id: 3,
        titulo: 'Formato',
        descripcion: '**Importante**\n[Visitar sitio](https://example.com)\n<script>alert(1)</script>',
        activo: true,
        fecha_creacion: '2026-10-11T08:00:00Z',
        fecha_actualizacion: '2026-10-11T08:00:00Z',
      },
    ])

    renderizar()

    expect(await screen.findByText('Importante', { selector: 'strong' })).toBeTruthy()
    const enlace = screen.getByRole('link', { name: 'Visitar sitio' })
    expect(enlace.getAttribute('href')).toBe('https://example.com')
    expect(enlace.getAttribute('target')).toBe('_blank')
    expect(enlace.getAttribute('rel')).toBe('noopener noreferrer')
    expect(screen.getByText('<script>alert(1)</script>')).toBeTruthy()
  })

  it('no convierte enlaces Markdown con protocolos inseguros en hipervínculos', async () => {
    fetchBoletinesActivos.mockResolvedValue([
      {
        id: 4,
        titulo: 'Enlace no seguro',
        descripcion: '[Abrir](javascript:alert(1))',
        activo: true,
        fecha_creacion: '2026-10-11T08:00:00Z',
        fecha_actualizacion: '2026-10-11T08:00:00Z',
      },
    ])

    renderizar()

    expect(await screen.findByText('[Abrir](javascript:alert(1))')).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Abrir' })).toBeNull()
  })

  it('convierte URL pegadas y menciones de Instagram en enlaces clickeables', async () => {
    const urlInstagram = 'https://instagram.com/se_o_no_se?vrfl=aG14aDgzbHhtaGoz&utm_source=qr'
    fetchBoletinesActivos.mockResolvedValue([
      {
        id: 5,
        titulo: 'Instagram',
        descripcion: `Seguinos en @se_o_no_se 🛜\n${urlInstagram}`,
        activo: true,
        fecha_creacion: '2026-10-11T08:00:00Z',
        fecha_actualizacion: '2026-10-11T08:00:00Z',
      },
    ])

    renderizar()

    const mencion = await screen.findByRole('link', { name: '@se_o_no_se' })
    expect(mencion.getAttribute('href')).toBe('https://www.instagram.com/se_o_no_se/')

    const urlPegada = screen.getByRole('link', { name: urlInstagram })
    expect(urlPegada.getAttribute('href')).toBe(urlInstagram)
    expect(urlPegada.getAttribute('target')).toBe('_blank')
    expect(urlPegada.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('mantiene la puntuación final fuera del enlace y no convierte menciones dentro de emails', async () => {
    fetchBoletinesActivos.mockResolvedValue([
      {
        id: 6,
        titulo: 'Texto con enlace y correo',
        descripcion: 'Visitá https://example.com. Escribinos a equipo@example.com',
        activo: true,
        fecha_creacion: '2026-10-11T08:00:00Z',
        fecha_actualizacion: '2026-10-11T08:00:00Z',
      },
    ])

    renderizar()

    const enlace = await screen.findByRole('link', { name: 'https://example.com' })
    expect(enlace.getAttribute('href')).toBe('https://example.com')
    expect(enlace.parentElement?.textContent).toBe('Visitá https://example.com. Escribinos a equipo@example.com')
    expect(screen.queryByRole('link', { name: 'equipo@example.com' })).toBeNull()
  })
})
