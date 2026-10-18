// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  guardarPerfil: vi.fn(),
  obtenerPerfilDePlayer: vi.fn(),
  obtenerTrofeosJugador: vi.fn(),
  obtenerPlayerId: vi.fn(() => 'player-profile-test'),
}))

vi.mock('../components/PaginaBase', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Portada: ({ titulo }: { titulo: string }) => <h1>{titulo}</h1>,
}))
vi.mock('../lib/aliasHelpers', () => ({
  guardarPerfil: mocks.guardarPerfil,
  obtenerPerfilDePlayer: mocks.obtenerPerfilDePlayer,
}))
vi.mock('../lib/playerIdentity', () => ({
  obtenerPlayerId: mocks.obtenerPlayerId,
}))
vi.mock('../lib/trofeos', () => ({
  obtenerTrofeosJugador: mocks.obtenerTrofeosJugador,
}))

const { default: PerfilPage } = await import('./PerfilPage')

describe('PerfilPage', () => {
  beforeEach(() => {
    mocks.guardarPerfil.mockReset()
    mocks.obtenerPerfilDePlayer.mockReset()
    mocks.obtenerTrofeosJugador.mockReset()
    mocks.obtenerTrofeosJugador.mockResolvedValue({ ok: true, datos: [] })
  })
  afterEach(cleanup)

  it('permite crear alias y seleccionar un avatar predefinido', async () => {
    mocks.obtenerPerfilDePlayer.mockResolvedValue({
      ok: true,
      perfil: { alias: null, avatar: null },
    })
    mocks.guardarPerfil.mockResolvedValue({
      ok: true,
      perfil: { alias: 'Nueva persona', avatar: '🦊' },
    })

    render(<PerfilPage />)

    const campo = await screen.findByLabelText('Alias')
    expect(await screen.findByText('Todavía no hay trofeos')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Avatar del jugador' }).textContent).toBe('👤')
    expect(screen.getByRole('button', { name: 'Elegir avatar 🚀' })).toBeTruthy()
    fireEvent.change(campo, { target: { value: '  Nueva persona  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Elegir avatar 🦊' }))
    expect(screen.getByRole('img', { name: 'Avatar del jugador' }).textContent).toBe('🦊')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Tu perfil se guardó correctamente.')).toBeTruthy()
    expect(mocks.guardarPerfil).toHaveBeenCalledWith('player-profile-test', 'Nueva persona', '🦊')
  })

  it('edita un alias existente y muestra errores de alias duplicado', async () => {
    mocks.obtenerPerfilDePlayer.mockResolvedValue({
      ok: true,
      perfil: { alias: 'Alias actual', avatar: '🐼' },
    })
    mocks.guardarPerfil.mockResolvedValue({ ok: false, motivo: 'duplicado' })

    render(<PerfilPage />)

    const campo = await screen.findByLabelText('Alias')
    fireEvent.change(campo, { target: { value: 'Alias ocupado' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect((await screen.findByRole('alert')).textContent).toContain('Ese alias ya lo está usando otro jugador.')
    expect(mocks.guardarPerfil).toHaveBeenCalledWith('player-profile-test', 'Alias ocupado', '🐼')
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeTruthy()
  })

  it('muestra por separado las copas de sala y el campeonato mensual global', async () => {
    mocks.obtenerPerfilDePlayer.mockResolvedValue({
      ok: true,
      perfil: { alias: 'Campeona', avatar: '🦊' },
    })
    mocks.obtenerTrofeosJugador.mockResolvedValue({
      ok: true,
      datos: [
        {
          tipo: 'sala',
          salaId: 7,
          salaNombre: 'Oficina',
          mes: null,
          empiezaEn: '2026-09-01T03:00:00Z',
          terminaEn: '2026-10-01T03:00:00Z',
          puntaje: 42,
        },
        {
          tipo: 'mensual',
          salaId: null,
          salaNombre: null,
          mes: '2026-09',
          empiezaEn: '2026-09-01T03:00:00Z',
          terminaEn: '2026-10-01T03:00:00Z',
          puntaje: 120,
        },
      ],
    })

    render(<PerfilPage />)

    expect(await screen.findByText('Oficina')).toBeTruthy()
    expect(screen.getByRole('heading', { name: '🏆 Copas de sala' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '🌟 Copas mensuales globales' })).toBeTruthy()
    expect(screen.getByText('Campeón mensual global · 120 puntos')).toBeTruthy()
  })
})
