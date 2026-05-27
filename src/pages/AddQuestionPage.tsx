import { useState } from 'react'

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

const tomorrow = () => {
  const date = new Date()

  date.setDate(date.getDate() + 1)

  return date.toISOString().slice(0, 10)
}

function AddQuestionPage() {
  const [showSidebar, setShowSidebar] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showStats, setShowStats] = useState(false)

  const [visualTheme, setVisualTheme] =
    useState<VisualTheme>(() => {
      const savedTheme = window.localStorage.getItem(
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

  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')

  const [choice1, setChoice1] = useState('')
  const [choice2, setChoice2] = useState('')
  const [choice3, setChoice3] = useState('')
  const [choice4, setChoice4] = useState('')

  const [availablefrom, setAvailableFrom] =
    useState(tomorrow())

  const [loading, setLoading] = useState(false)

  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

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
        .map((choice) => choice.trim())
        .filter(Boolean)

      const { error } = await supabase
        .from('questions')
        .insert({
          question: question.trim(),
          answer: answer.trim(),
          choices,
          availablefrom: availablefrom,
          enabled: true,
        })

      if (error) {
        setError(error.message)
        return
      }

      setSuccess('Pregunta agregada correctamente.')

      setQuestion('')
      setAnswer('')

      setChoice1('')
      setChoice2('')
      setChoice3('')
      setChoice4('')

      setAvailableFrom(tomorrow())
    } catch (exception) {
      console.error(exception)

      setError('Ocurrió un error inesperado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        visualTheme === 'black'
          ? 'bg-black text-white'
          : visualTheme === 'dark'
            ? 'bg-slate-950 text-slate-100'
            : visualTheme === 'blue'
              ? 'bg-sky-50 text-slate-950'
              : visualTheme === 'sepia'
                ? 'bg-[#f7ede2] text-slate-950'
                : 'bg-slate-50 text-slate-900'
      }`}
    >
      <Header
        onOpenSidebar={() => setShowSidebar(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenStats={() => setShowStats(true)}
      />

      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">
            Agregar pregunta
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Panel administrativo de preguntas.
          </p>
        </div>

        <div
          className={`rounded-2xl border p-6 shadow-sm ${
            visualTheme === 'black'
              ? 'border-slate-800 bg-slate-950'
              : visualTheme === 'dark'
                ? 'border-slate-800 bg-slate-900'
                : 'border-slate-200 bg-white'
          }`}
        >
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label className="mb-2 block text-sm font-medium">
                Pregunta
              </label>

              <textarea
                value={question}
                onChange={(event) =>
                  setQuestion(event.target.value)
                }
                rows={3}
                className={`w-full rounded-xl border px-4 py-3 outline-none transition ${
                  visualTheme === 'black' ||
                  visualTheme === 'dark'
                    ? 'border-slate-700 bg-slate-950 text-white focus:border-white'
                    : 'border-slate-300 bg-white text-slate-900 focus:border-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Respuesta correcta
              </label>

              <input
                type="text"
                value={answer}
                onChange={(event) =>
                  setAnswer(event.target.value)
                }
                className={`w-full rounded-xl border px-4 py-3 outline-none transition ${
                  visualTheme === 'black' ||
                  visualTheme === 'dark'
                    ? 'border-slate-700 bg-slate-950 text-white focus:border-white'
                    : 'border-slate-300 bg-white text-slate-900 focus:border-slate-900'
                }`}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <input
                type="text"
                placeholder="Opción 1"
                value={choice1}
                onChange={(event) =>
                  setChoice1(event.target.value)
                }
                className={`rounded-xl border px-4 py-3 ${
                  visualTheme === 'black' ||
                  visualTheme === 'dark'
                    ? 'border-slate-700 bg-slate-950 text-white'
                    : 'border-slate-300 bg-white text-slate-900'
                }`}
              />

              <input
                type="text"
                placeholder="Opción 2"
                value={choice2}
                onChange={(event) =>
                  setChoice2(event.target.value)
                }
                className={`rounded-xl border px-4 py-3 ${
                  visualTheme === 'black' ||
                  visualTheme === 'dark'
                    ? 'border-slate-700 bg-slate-950 text-white'
                    : 'border-slate-300 bg-white text-slate-900'
                }`}
              />

              <input
                type="text"
                placeholder="Opción 3"
                value={choice3}
                onChange={(event) =>
                  setChoice3(event.target.value)
                }
                className={`rounded-xl border px-4 py-3 ${
                  visualTheme === 'black' ||
                  visualTheme === 'dark'
                    ? 'border-slate-700 bg-slate-950 text-white'
                    : 'border-slate-300 bg-white text-slate-900'
                }`}
              />

              <input
                type="text"
                placeholder="Opción 4"
                value={choice4}
                onChange={(event) =>
                  setChoice4(event.target.value)
                }
                className={`rounded-xl border px-4 py-3 ${
                  visualTheme === 'black' ||
                  visualTheme === 'dark'
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
                value={availablefrom}
                onChange={(event) =>
                  setAvailableFrom(event.target.value)
                }
                className={`w-full rounded-xl border px-4 py-3 ${
                  visualTheme === 'black' ||
                  visualTheme === 'dark'
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

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {loading
                ? 'Guardando...'
                : 'Guardar pregunta'}
            </button>
          </form>
        </div>
      </main>

      <Sidebar
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        visualTheme={visualTheme}
        onChangeTheme={setVisualTheme}
      />

      {showStats && (
        <StatsModal
          onClose={() => setShowStats(false)}
        />
      )}
    </div>
  )
}

export default AddQuestionPage