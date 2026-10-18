// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  guardarPerfil: vi.fn(),
  obtenerPerfilDePlayer: vi.fn(),
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

const { default: PerfilPage } = await import('./PerfilPage')

describe('PerfilPage', () => {
  beforeEach(() => {
    mocks.guardarPerfil.mockReset()
    mocks.obtenerPerfilDePlayer.mockReset()
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
})
