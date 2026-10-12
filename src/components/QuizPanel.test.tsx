// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  fireEvent.click(screen.getByRole('button', { name: 'París' }))
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente pregunta' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Venus' }))
  fireEvent.click(screen.getByRole('button', { name: 'Ver resultados' }))
}

beforeEach(() => {
  insertsSesion.length = 0
  errorSesion = null
  window.localStorage.clear()
  vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))
})

afterEach(() => {
  cleanup()
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
