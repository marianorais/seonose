// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Manejador = (parametros: Record<string, unknown>) => unknown

const respuestas: Record<string, Manejador> = {}
const rpc = vi.fn(async (nombre: string, parametros: Record<string, unknown>) => {
  const manejador = respuestas[nombre]
  if (!manejador) throw new Error(`RPC sin mock: ${nombre}`)
  return manejador(parametros)
})
const insertarAlias = vi.fn(async () => ({ error: null }))

vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: (nombre: string, parametros: Record<string, unknown>) => rpc(nombre, parametros),
    from: () => ({ insert: insertarAlias }),
  },
}))

const { default: SalasPage } = await import('./SalasPage')
const { default: SalaPage } = await import('./SalaPage')

const Ubicacion = () => {
  const { pathname, search } = useLocation()
  return <p data-testid="ubicacion">{`${pathname}${search}`}</p>
}

const renderizar = (ruta: string) =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/salas" element={<SalasPage />} />
        <Route path="/sala/:codigo" element={<SalaPage />} />
        <Route path="*" element={<Ubicacion />} />
      </Routes>
      <Ubicacion />
    </MemoryRouter>
  )

const ok = (data: unknown) => ({ data, error: null })

const fila = (datos: Record<string, unknown>) => ({
  clave: 'p0000000000a',
  alias: 'Ana',
  puntos: 0,
  partidas: 0,
  correctas: 0,
  total: 0,
  victorias: 0,
  porcentaje: 0,
  posicion: 1,
  jugo_hoy: false,
  es_actual: false,
  ...datos,
})

const detalle = (tabla: unknown[], extra: Record<string, unknown> = {}) =>
  ok({
    estado: 'ok',
    hoy: '2026-10-11',
    sala: { codigo: 'abcd2345xy', nombre: 'Oficina', creada_en: '2026-10-09T10:00:00Z', desde: '2026-10-09', integrantes: tabla.length, soy_propietario: false, ...extra },
    tabla,
    actividad: [],
  })

beforeEach(() => {
  rpc.mockClear()
  insertarAlias.mockClear()
  for (const clave of Object.keys(respuestas)) delete respuestas[clave]
  respuestas.mis_salas = () => ok({ estado: 'ok', salas: [] })
  window.localStorage.clear()
})

afterEach(() => cleanup())

describe('crear una sala', () => {
  it('valida el nombre antes de enviar', async () => {
    renderizar('/salas')

    fireEvent.change(screen.getByLabelText('Nombre de la sala'), { target: { value: '<script>' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear sala' }))

    expect(await screen.findByText('El nombre no puede tener los símbolos < ni >.')).toBeTruthy()
    expect(rpc).not.toHaveBeenCalledWith('crear_sala', expect.anything())
  })

  it('un doble clic crea una sola sala y lleva a la sala nueva', async () => {
    respuestas.crear_sala = () => ok({ estado: 'ok', codigo: 'abcd2345xy', nombre: 'Oficina' })
    respuestas.ver_sala = () => ok({ estado: 'ok', codigo: 'abcd2345xy', nombre: 'Oficina', integrantes: 1, creada_por: 'Ana', es_integrante: true })
    respuestas.ranking_sala = () => detalle([fila({ es_actual: true })], { soy_propietario: true })

    renderizar('/salas')

    fireEvent.change(screen.getByLabelText('Nombre de la sala'), { target: { value: '  Oficina ' } })
    const boton = screen.getByRole('button', { name: 'Crear sala' })
    fireEvent.click(boton)
    fireEvent.click(boton)

    expect(await screen.findByText(/tu sala está creada/)).toBeTruthy()
    expect(rpc.mock.calls.filter(([nombre]) => nombre === 'crear_sala')).toHaveLength(1)
    expect(rpc).toHaveBeenCalledWith('crear_sala', expect.objectContaining({ p_nombre: 'Oficina' }))
    expect(screen.getAllByTestId('ubicacion')[0].textContent).toBe('/sala/abcd2345xy?nueva=1')
    // Sala nueva y sola: la invitación se destaca.
    expect(screen.getByText(/Por ahora estás solo/)).toBeTruthy()
  })

  it('muestra un error claro si no hay conexión y permite reintentar', async () => {
    respuestas.crear_sala = () => {
      throw new TypeError('Failed to fetch')
    }

    renderizar('/salas')

    fireEvent.change(screen.getByLabelText('Nombre de la sala'), { target: { value: 'Oficina' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear sala' }))

    expect(await screen.findByText(/No hay conexión/)).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Crear sala' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('si falta el alias, lo pide en el momento', async () => {
    respuestas.crear_sala = () => ok({ estado: 'sin-alias' })

    renderizar('/salas')

    fireEvent.change(screen.getByLabelText('Nombre de la sala'), { target: { value: 'Oficina' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear sala' }))

    expect(await screen.findByText('¿Cómo querés que te llamemos?')).toBeTruthy()
  })
})

describe('unirse por link', () => {
  it('quien llega por invitación ve la sala y se une con un toque', async () => {
    let integrante = false
    respuestas.ver_sala = () =>
      ok({ estado: 'ok', codigo: 'abcd2345xy', nombre: 'Oficina', integrantes: 2, creada_por: 'Ana', es_integrante: integrante })
    respuestas.unirse_sala = () => {
      integrante = true
      return ok({ estado: 'ok' })
    }
    respuestas.ranking_sala = () =>
      detalle([
        fila({ clave: 'p0000000000a', alias: 'Ana', puntos: 13, partidas: 2, correctas: 13, total: 16, porcentaje: 81.3, posicion: 1 }),
        fila({ clave: 'p0000000000b', alias: 'Beto', posicion: 2, es_actual: true }),
      ])

    renderizar('/sala/ABCD2345XY')

    expect(await screen.findByText('Te invitaron a una sala')).toBeTruthy()
    expect(screen.getByText('Oficina')).toBeTruthy()
    expect(screen.getByText(/Creada por Ana/)).toBeTruthy()
    expect(rpc).not.toHaveBeenCalledWith('ranking_sala', expect.anything())

    fireEvent.click(screen.getByRole('button', { name: 'Unirme a la sala' }))

    expect(await screen.findByRole('heading', { name: 'Ranking' })).toBeTruthy()
    expect(screen.getByText('Beto')).toBeTruthy()
    expect(screen.getByText('Vos')).toBeTruthy()
    expect(screen.getByText(/Todavía no sumaste puntos/)).toBeTruthy()
  })

  it('un link inválido o de una sala inexistente muestra un mensaje útil', async () => {
    renderizar('/sala/esto-no')
    expect(await screen.findByText('No encontramos esta sala')).toBeTruthy()
    expect(rpc).not.toHaveBeenCalledWith('ver_sala', expect.anything())

    cleanup()
    respuestas.ver_sala = () => ok({ estado: 'no-existe' })
    renderizar('/sala/abcd2345xy')
    expect(await screen.findByText('No encontramos esta sala')).toBeTruthy()
  })
})

describe('pantalla de la sala', () => {
  beforeEach(() => {
    respuestas.ver_sala = () => ok({ estado: 'ok', codigo: 'abcd2345xy', nombre: 'Oficina', integrantes: 1, creada_por: 'Ana', es_integrante: true })
  })

  it('sala vacía: explica cuándo arranca el ranking', async () => {
    respuestas.ranking_sala = () => detalle([fila({ es_actual: true })], { soy_propietario: true })

    renderizar('/sala/abcd2345xy')

    expect(await screen.findByText('El ranking arranca con el próximo desafío')).toBeTruthy()
    expect(screen.getByText('Jugá el desafío de hoy y sumá puntos')).toBeTruthy()
  })

  it('copia el link de invitación', async () => {
    const escribir = vi.fn(async () => undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: escribir }, configurable: true })
    respuestas.ranking_sala = () => detalle([fila({ es_actual: true })])

    renderizar('/sala/abcd2345xy')

    fireEvent.click(await screen.findByRole('button', { name: /Copiar link/ }))

    expect(await screen.findByText('¡Link copiado! Pegalo en tu grupo.')).toBeTruthy()
    expect(escribir).toHaveBeenCalledWith(expect.stringMatching(/\/sala\/abcd2345xy$/))
  })

  it('eliminar pide confirmación y sólo después ejecuta', async () => {
    respuestas.ranking_sala = () => detalle([fila({ es_actual: true })], { soy_propietario: true })
    respuestas.eliminar_sala = () => ok({ estado: 'ok' })

    renderizar('/sala/abcd2345xy')

    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar la sala' }))
    expect(rpc).not.toHaveBeenCalledWith('eliminar_sala', expect.anything())

    fireEvent.click(screen.getByRole('button', { name: 'Sí, eliminar' }))

    await waitFor(() => expect(rpc).toHaveBeenCalledWith('eliminar_sala', expect.anything()))
    await waitFor(() => expect(screen.getAllByTestId('ubicacion')[0].textContent).toBe('/salas'))
  })

  it('quien no administra la sala no ve la opción de eliminarla', async () => {
    respuestas.ranking_sala = () => detalle([fila({ es_actual: true })], { soy_propietario: false })

    renderizar('/sala/abcd2345xy')

    expect(await screen.findByRole('button', { name: 'Salir de la sala' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Eliminar la sala' })).toBeNull()
  })
})
