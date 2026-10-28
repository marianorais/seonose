// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { QuestionItem } from '../types'

// Supabase simulado: registra lo que la app intenta guardar.
const insertsSesion: Record<string, unknown>[] = []
let errorSesion: { message: string } | null = null

vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(async () => ({ data: { estado: 'ok' }, error: null })),
    from: (tabla: string) => ({
      insert: (payload: Record<string, unknown>) => {
        if (tabla === 'game_answers') return Promise.resolve({ error: null })
        insertsSesion.push(payload)
        return {
          select: () => ({
            single: async () =>
              errorSesion ? { data: null, error: errorSesion } : { data: { id: 77, playerid: payload.playerid }, error: null },
          }),
        }
      },
    }),
  },
}))

// Analítica real (links, nombres de eventos) pero con el envío espiado.
const eventos: { nombre: string; parametros?: Record<string, unknown> }[] = []

vi.mock('../lib/analytics', async (importOriginal) => {
  const real = await importOriginal<typeof import('../lib/analytics')>()
  return {
    ...real,
    registrarEvento: (nombre: string, parametros?: Record<string, unknown>) => eventos.push({ nombre, parametros }),
  }
})

const { default: QuizPanel } = await import('./QuizPanel')

const preguntas: QuestionItem[] = [
  { id: 11, question: '¿Capital de Francia?', answer: 'París', choices: ['Roma', 'París', 'Madrid'] },
  { id: 12, question: '¿Planeta rojo?', answer: 'Marte', choices: ['Marte', 'Venus', 'Júpiter'] },
]

const renderizar = (props: Partial<Parameters<typeof QuizPanel>[0]> = {}) =>
  render(
    <MemoryRouter>
      <QuizPanel
        questions={preguntas}
        settings={{ questionsPerDay: 2, secondsPerQuestion: 30 }}
        questionDate="2026-10-11"
        allowReplay={false}
        {...props}
      />
    </MemoryRouter>
  )

const jugar = async () => {
  fireEvent.click(screen.getByRole('button', { name: /¡JUGAR AHORA!/ }))
  fireEvent.click(screen.getByRole('button', { name: 'París' }))
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente pregunta' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Venus' }))
  fireEvent.click(screen.getByRole('button', { name: 'Ver resultados' }))
}

beforeEach(() => {
  eventos.length = 0
  insertsSesion.length = 0
  errorSesion = null
  window.localStorage.clear()
  vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('desafío de hoy (sin cambios)', () => {
  it('se juega y se guarda como siempre, sin campos nuevos', async () => {
    renderizar()
    await jugar()

    expect(await screen.findByText('1 de 2 correctas')).toBeTruthy()
    await waitFor(() => expect(insertsSesion).toHaveLength(1))
    expect(insertsSesion[0]).toMatchObject({ totalquestions: 2, correctanswers: 1 })
    expect(insertsSesion[0]).not.toHaveProperty('es_anterior')
    expect(insertsSesion[0]).not.toHaveProperty('fecha_desafio')
    expect(screen.getByText(/Nuevo desafío en/)).toBeTruthy()
    expect(screen.getByText('Desafiá a tus amigos')).toBeTruthy()
  })

  it('mide inicio y final una sola vez, sin respuestas en los parámetros', async () => {
    renderizar()
    await jugar()
    await screen.findByText('1 de 2 correctas')

    expect(eventos.filter((e) => e.nombre === 'game_start')).toEqual([{ nombre: 'game_start', parametros: { tipo: 'diario' } }])
    expect(eventos.filter((e) => e.nombre === 'game_complete')).toEqual([
      { nombre: 'game_complete', parametros: { tipo: 'diario', aciertos: 1, total: 2 } },
    ])
    expect(JSON.stringify(eventos)).not.toMatch(/París|Venus|Marte/)
  })

  it('al terminar muestra la racha y comparte un reto sin revelar respuestas', async () => {
    const copiado: string[] = []
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (texto: string) => void copiado.push(texto) },
    })

    renderizar()
    await jugar()
    await screen.findByText('1 de 2 correctas')

    expect(screen.getByText(/Volvé mañana y empezá tu racha/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Copiar resultado' }))
    expect(await screen.findByText('Texto copiado')).toBeTruthy()

    expect(copiado).toHaveLength(1)
    expect(copiado[0]).toContain('1/2')
    expect(copiado[0]).toContain('¿Podés superarme?')
    expect(copiado[0]).toContain('?c=cp')
    expect(copiado[0]).not.toMatch(/París|Venus|Marte/)
    expect(eventos.filter((e) => e.nombre === 'share_click')).toEqual([
      { nombre: 'share_click', parametros: { canal: 'copiar', tipo: 'diario' } },
    ])
  })

  it('muestra la bienvenida antes de la pregunta y recién inicia el reloj al confirmar', async () => {
    vi.useFakeTimers()
    renderizar()

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'SEoNOSE' })).toBeTruthy()
    expect(
      screen.getByText((_, element) => element?.textContent?.replace(/\s+/g, ' ').trim() === '30 s por pregunta')
    ).toBeTruthy()
    expect(screen.getByText('De Historia y Geografía a Música, Deportes y mucho más.')).toBeTruthy()
    expect(screen.queryByText('¿Capital de Francia?')).toBeNull()

    act(() => vi.advanceTimersByTime(5000))
    fireEvent.click(screen.getByRole('button', { name: /¡JUGAR AHORA!/ }))

    expect(screen.getByText('¿Capital de Francia?')).toBeTruthy()
    expect(screen.getByRole('timer').textContent).toBe('30')
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByRole('timer').textContent).toBe('29')
    vi.useRealTimers()
  })

  it('inicia la partida al cerrar la bienvenida con la cruz', () => {
    renderizar()

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar bienvenida' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText('¿Capital de Francia?')).toBeTruthy()
    expect(screen.getByRole('timer').textContent).toBe('30')
    expect(insertsSesion).toHaveLength(0)
  })

  it('inicia la partida al cerrar la bienvenida haciendo clic fuera del panel', () => {
    renderizar()
    fireEvent.click(screen.getByRole('dialog'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText('¿Capital de Francia?')).toBeTruthy()
    expect(screen.getByRole('timer').textContent).toBe('30')
    expect(insertsSesion).toHaveLength(0)
  })

  it('evita seleccionar o copiar el texto de la pregunta', () => {
    renderizar()
    fireEvent.click(screen.getByRole('button', { name: /¡JUGAR AHORA!/ }))

    const heading = screen.getByRole('heading', { name: '¿Capital de Francia?' })
    expect(heading.className).toContain('select-none')

    const copyEvent = new Event('copy', { bubbles: true, cancelable: true })
    heading.dispatchEvent(copyEvent)
    expect(copyEvent.defaultPrevented).toBe(true)
  })
})

describe('desafío anterior', () => {
  const props = { esAnterior: true, questionDate: '2026-10-08', numeroDesafio: 94, claveEstado: 'seonose-quiz-state-anterior-2026-10-08' }

  it('se guarda con su fecha, muestra el día y no pisa la partida de hoy', async () => {
    window.localStorage.setItem('seonose-quiz-state', JSON.stringify({ dayKey: '2026-10-11', currentIndex: 1, answers: [] }))

    renderizar(props)
    await jugar()

    expect(await screen.findByText('Desafío #94 · jueves, 8 de octubre')).toBeTruthy()
    await waitFor(() => expect(insertsSesion).toHaveLength(1))
    expect(insertsSesion[0]).toMatchObject({ fecha_desafio: '2026-10-08', es_anterior: true })
    expect(screen.queryByText(/Nuevo desafío en/)).toBeNull()
    // Suma al ranking del mes y del año: se ofrece ir a verlo.
    expect(screen.getByText('Mirá en qué puesto quedaste')).toBeTruthy()
    expect(JSON.parse(window.localStorage.getItem('seonose-quiz-state') ?? '{}').currentIndex).toBe(1)
  })

  it('si ya se había jugado, avisa que vale el primero', async () => {
    errorSesion = { message: 'desafio-ya-jugado' }

    renderizar(props)
    await jugar()

    expect(await screen.findByText(/ya lo habías jugado en este dispositivo/)).toBeTruthy()
  })
})
