import { useEffect, useState } from 'react'

import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import SettingsModal from '../components/SettingsModal'
import StatsModal from '../components/StatsModal'

import type { QuestionSettings } from '../types'

import { supabase } from '../lib/supabase'

type VisualTheme =
  | 'light'
  | 'dark'
  | 'black'
  | 'blue'
  | 'sepia'

interface QuestionAdminItem {
  id: number
  question: string
  answer: string
  choices: string[]
  availablefrom: string
  enabled: boolean
}

const tomorrow = () => {
  const date = new Date()

  date.setDate(date.getDate() + 1)

  const year = date.getFullYear()

  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0')

  const day = String(
    date.getDate()
  ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function AdminPreguntasPage() {
  const [showSidebar, setShowSidebar] =
    useState(false)

  const [showSettings, setShowSettings] =
    useState(false)

  const [showStats, setShowStats] =
    useState(false)

  const [visualTheme, setVisualTheme] =
    useState<VisualTheme>(() => {
      const savedTheme =
        window.localStorage.getItem(
          'seonose-theme'
        ) as VisualTheme | null

      if (
        savedTheme === 'dark' ||
        savedTheme === 'black' ||
        savedTheme === 'blue' ||
        savedTheme === 'sepia' ||
        savedTheme === 'light'
      ) {
        return savedTheme
      }

      return 'light'
    })

  const settings: QuestionSettings = {
    questionsPerDay: 5,
    secondsPerQuestion: 30,
  }

  const [question, setQuestion] =
    useState('')

  const [answer, setAnswer] =
    useState('')

  const [choice1, setChoice1] =
    useState('')

  const [choice2, setChoice2] =
    useState('')

  const [choice3, setChoice3] =
    useState('')

  const [choice4, setChoice4] =
    useState('')

  const [
    availablefrom,
    setAvailableFrom,
  ] = useState(tomorrow())

  const [loading, setLoading] =
    useState(false)

  const [success, setSuccess] =
    useState('')

  const [error, setError] =
    useState('')

  const [
    questionsList,
    setQuestionsList,
  ] = useState<QuestionAdminItem[]>([])

  const [editingId, setEditingId] =
    useState<number | null>(null)

  const loadQuestions =
    async () => {
      const { data, error } =
        await supabase
          .from('questions')
          .select('*')
          .order(
            'availablefrom',
            {
              ascending: false,
            }
          )

      if (error) {
        console.error(error)
        return
      }

      const mappedQuestions =
        (data ?? []).map(
          (item: {
            id: number
            question: string
            answer: string
            choices: string[]
            availablefrom: string
            enabled: boolean
          }) => ({
            id: item.id,
            question:
              item.question,
            answer:
              item.answer,
            choices:
              item.choices ??
              [],
            availablefrom:
              item.availablefrom,
            enabled:
              item.enabled,
          })
        )

      setQuestionsList(
        mappedQuestions
      )
    }

  useEffect(() => {
    loadQuestions()
  }, [])

  const toggleEnabled =
    async (
      id: number,
      enabled: boolean
    ) => {
      const { error } =
        await supabase
          .from('questions')
          .update({
            enabled:
              !enabled,
          })
          .eq('id', id)

      if (error) {
        console.error(error)
        return
      }

      await loadQuestions()
    }

  const startEdit = (
    questionItem: QuestionAdminItem
  ) => {
    setEditingId(
      questionItem.id
    )

    setQuestion(
      questionItem.question
    )

    setAnswer(
      questionItem.answer
    )

    setChoice1(
      questionItem
        .choices[0] ?? ''
    )

    setChoice2(
      questionItem
        .choices[1] ?? ''
    )

    setChoice3(
      questionItem
        .choices[2] ?? ''
    )

    setChoice4(
      questionItem
        .choices[3] ?? ''
    )

    setAvailableFrom(
      questionItem.availablefrom
    )

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  const resetForm = () => {
    setEditingId(null)

    setQuestion('')
    setAnswer('')

    setChoice1('')
    setChoice2('')
    setChoice3('')
    setChoice4('')

    setAvailableFrom(
      tomorrow()
    )
  }

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    setSuccess('')
    setError('')

    try {
      setLoading(true)

      const choices = [
        choice1,
        choice2,
        choice3,
        choice4,
      ]
        .map((choice) =>
          choice.trim()
        )
        .filter(Boolean)

      const result =
        editingId
          ? await supabase
              .from(
                'questions'
              )
              .update({
                question:
                  question.trim(),

                answer:
                  answer.trim(),

                choices,

                availablefrom,

                enabled: true,
              })
              .eq(
                'id',
                editingId
              )

          : await supabase
              .from(
                'questions'
              )
              .insert({
                question:
                  question.trim(),

                answer:
                  answer.trim(),

                choices,

                availablefrom,

                enabled: true,
              })

      const { error } =
        result

      if (error) {
        setError(
          error.message
        )

        return
      }

      setSuccess(
        editingId
          ? 'Pregunta modificada correctamente.'
          : 'Pregunta agregada correctamente.'
      )

      resetForm()

      await loadQuestions()
    } catch (exception) {
      console.error(
        exception
      )

      setError(
        'Ocurrió un error inesperado.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        visualTheme ===
        'black'
          ? 'bg-black text-white'
          : visualTheme ===
              'dark'
            ? 'bg-slate-950 text-slate-100'
            : visualTheme ===
                'blue'
              ? 'bg-sky-50 text-slate-950'
              : visualTheme ===
                  'sepia'
                ? 'bg-[#f7ede2] text-slate-950'
                : 'bg-slate-50 text-slate-900'
      }`}
    >
      <Header
        onOpenSidebar={() =>
          setShowSidebar(true)
        }
        onOpenSettings={() =>
          setShowSettings(true)
        }
        onOpenStats={() =>
          setShowStats(true)
        }
      />

      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">
            {editingId
              ? 'Editar pregunta'
              : 'Agregar pregunta'}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Panel
            administrativo de
            preguntas.
          </p>
        </div>

        <div
          className={`rounded-2xl border p-6 shadow-sm ${
            visualTheme ===
              'black' ||
            visualTheme ===
              'dark'
              ? 'border-slate-800 bg-slate-900'
              : 'border-slate-200 bg-white'
          }`}
        >
          <form
            onSubmit={
              handleSubmit
            }
            className="space-y-5"
          >
            <div>
              <label className="mb-2 block text-sm font-medium">
                Pregunta
              </label>

              <textarea
                value={
                  question
                }
                onChange={(
                  event
                ) =>
                  setQuestion(
                    event.target
                      .value
                  )
                }
                rows={3}
                className={`w-full rounded-xl border px-4 py-3 outline-none transition ${
                  visualTheme ===
                    'black' ||
                  visualTheme ===
                    'dark'
                    ? 'border-slate-700 bg-slate-950 text-white focus:border-white'
                    : 'border-slate-300 bg-white text-slate-900 focus:border-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Respuesta
                correcta
              </label>

              <input
                type="text"
                value={
                  answer
                }
                onChange={(
                  event
                ) =>
                  setAnswer(
                    event.target
                      .value
                  )
                }
                className={`w-full rounded-xl border px-4 py-3 outline-none transition ${
                  visualTheme ===
                    'black' ||
                  visualTheme ===
                    'dark'
                    ? 'border-slate-700 bg-slate-950 text-white focus:border-white'
                    : 'border-slate-300 bg-white text-slate-900 focus:border-slate-900'
                }`}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <input
                type="text"
                placeholder="Opción 1"
                value={
                  choice1
                }
                onChange={(
                  event
                ) =>
                  setChoice1(
                    event.target
                      .value
                  )
                }
                className={`rounded-xl border px-4 py-3 ${
                  visualTheme ===
                    'black' ||
                  visualTheme ===
                    'dark'
                    ? 'border-slate-700 bg-slate-950 text-white'
                    : 'border-slate-300 bg-white text-slate-900'
                }`}
              />

              <input
                type="text"
                placeholder="Opción 2"
                value={
                  choice2
                }
                onChange={(
                  event
                ) =>
                  setChoice2(
                    event.target
                      .value
                  )
                }
                className={`rounded-xl border px-4 py-3 ${
                  visualTheme ===
                    'black' ||
                  visualTheme ===
                    'dark'
                    ? 'border-slate-700 bg-slate-950 text-white'
                    : 'border-slate-300 bg-white text-slate-900'
                }`}
              />

              <input
                type="text"
                placeholder="Opción 3"
                value={
                  choice3
                }
                onChange={(
                  event
                ) =>
                  setChoice3(
                    event.target
                      .value
                  )
                }
                className={`rounded-xl border px-4 py-3 ${
                  visualTheme ===
                    'black' ||
                  visualTheme ===
                    'dark'
                    ? 'border-slate-700 bg-slate-950 text-white'
                    : 'border-slate-300 bg-white text-slate-900'
                }`}
              />

              <input
                type="text"
                placeholder="Opción 4"
                value={
                  choice4
                }
                onChange={(
                  event
                ) =>
                  setChoice4(
                    event.target
                      .value
                  )
                }
                className={`rounded-xl border px-4 py-3 ${
                  visualTheme ===
                    'black' ||
                  visualTheme ===
                    'dark'
                    ? 'border-slate-700 bg-slate-950 text-white'
                    : 'border-slate-300 bg-white text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Fecha
              </label>

              <input
                type="date"
                value={
                  availablefrom
                }
                onChange={(
                  event
                ) =>
                  setAvailableFrom(
                    event.target
                      .value
                  )
                }
                className={`w-full rounded-xl border px-4 py-3 ${
                  visualTheme ===
                    'black' ||
                  visualTheme ===
                    'dark'
                    ? 'border-slate-700 bg-slate-950 text-white'
                    : 'border-slate-300 bg-white text-slate-900'
                }`}
              />
            </div>

            {success && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {success}
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={
                  loading
                }
                className="flex-1 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {loading
                  ? 'Guardando...'
                  : editingId
                    ? 'Guardar cambios'
                    : 'Guardar pregunta'}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={
                    resetForm
                  }
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="mt-10 space-y-4">
          <h2 className="text-2xl font-bold">
            Preguntas
            cargadas
          </h2>

          {questionsList.map(
            (item) => (
              <div
                key={
                  item.id
                }
                className={`rounded-2xl border p-5 ${
                  visualTheme ===
                    'black' ||
                  visualTheme ===
                    'dark'
                    ? 'border-slate-700 bg-slate-900'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <p className="text-lg font-semibold">
                      {
                        item.question
                      }
                    </p>

                    <p className="text-sm opacity-70">
                      Fecha:{' '}
                      {
                        item.availablefrom
                      }
                    </p>

                    <p className="text-sm">
                      Estado:{' '}
                      <span
                        className={
                          item.enabled
                            ? 'text-green-600'
                            : 'text-red-600'
                        }
                      >
                        {item.enabled
                          ? 'Habilitada'
                          : 'Deshabilitada'}
                      </span>
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        startEdit(
                          item
                        )
                      }
                      className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        toggleEnabled(
                          item.id,
                          item.enabled
                        )
                      }
                      className={`rounded-xl px-4 py-2 text-sm font-medium text-white ${
                        item.enabled
                          ? 'bg-red-600'
                          : 'bg-green-600'
                      }`}
                    >
                      {item.enabled
                        ? 'Deshabilitar'
                        : 'Habilitar'}
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </main>

      <Sidebar
        isOpen={
          showSidebar
        }
        onClose={() =>
          setShowSidebar(false)
        }
      />

      <SettingsModal
        isOpen={
          showSettings
        }
        onClose={() =>
          setShowSettings(false)
        }
        settings={
          settings
        }
        visualTheme={
          visualTheme
        }
        onChangeTheme={
          setVisualTheme
        }
      />

      {showStats && (
        <StatsModal
          onClose={() =>
            setShowStats(false)
          }
        />
      )}
    </div>
  )
}

export default AdminPreguntasPage