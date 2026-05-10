import { useEffect, useState } from 'react'
import Header from './components/Header'
import QuizPanel from './components/QuizPanel'
import Sidebar from './components/Sidebar'
import SettingsModal from './components/SettingsModal'
import StatsModal from './components/StatsModal'
import type { QuestionItem, QuestionSettings } from './types'

type VisualTheme = 'light' | 'dark' | 'black' | 'blue' | 'sepia'

const FALLBACK_SETTINGS: QuestionSettings = {
  questionsPerDay: 5,
  secondsPerQuestion: 30,
}

const FALLBACK_QUESTIONS: QuestionItem[] = [
  { id: 1, question: '¿Cuál es la capital de Francia?', answer: 'París', choices: ['Londres', 'París', 'Berlín', 'Madrid'] },
  { id: 2, question: '¿Cuántos días tiene una semana?', answer: 'Siete', choices: ['Cinco', 'Siete', 'Ocho', 'Nueve'] },
  { id: 3, question: '¿En qué continente está Argentina?', answer: 'América' },
  { id: 4, question: '¿Qué planeta es conocido como el planeta rojo?', answer: 'Marte', choices: ['Venus', 'Marte', 'Júpiter', 'Saturno'] },
  { id: 5, question: '¿Cuál es el color del cielo en un día claro?', answer: 'Azul' },
]

function App() {
  const [showStats, setShowStats] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [visualTheme, setVisualTheme] = useState<VisualTheme>('light')
  const [questions, setQuestions] = useState<QuestionItem[]>([])
  const [settings, setSettings] = useState<QuestionSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [warning, setWarning] = useState<string | null>(null)

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('seonose-theme') as VisualTheme | null
    if (savedTheme === 'dark' || savedTheme === 'black' || savedTheme === 'blue' || savedTheme === 'sepia' || savedTheme === 'light') {
      setVisualTheme(savedTheme)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem('seonose-theme', visualTheme)
  }, [visualTheme])

  useEffect(() => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

    const loadData = async () => {
      try {
        const [settingsResponse, questionsResponse] = await Promise.all([
          fetch(`${baseUrl}/api/questions/settings`),
          fetch(`${baseUrl}/api/questions`),
        ])

        if (!settingsResponse.ok || !questionsResponse.ok) {
          throw new Error(
            `Error al cargar la API de backend: settings ${settingsResponse.status} questions ${questionsResponse.status}`
          )
        }

        const settingsData = (await settingsResponse.json()) as QuestionSettings
        const questionsData = (await questionsResponse.json()) as QuestionItem[]

        setSettings(settingsData)
        setQuestions(questionsData)
      } catch (exception) {
        console.error(exception)
        setWarning('No se pudo conectar al backend. Usando datos locales de demo.')
        setSettings(FALLBACK_SETTINGS)
        setQuestions(FALLBACK_QUESTIONS)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  return (
    <div className={`min-h-screen transition-colors duration-300 ${visualTheme === 'black' ? 'bg-black text-white' : visualTheme === 'dark' ? 'bg-slate-950 text-slate-100' : visualTheme === 'blue' ? 'bg-sky-50 text-slate-950' : visualTheme === 'sepia' ? 'bg-[#f7ede2] text-slate-950' : 'bg-slate-50 text-slate-900'}`}>
      <Header
        onOpenSidebar={() => setShowSidebar(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenStats={() => setShowStats(true)}
      />
      <main className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center px-4 py-8 lg:px-8">
        {loading ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-600">Cargando contenido...</div>
        ) : (
          <div className="w-full space-y-4">
            {warning && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                {warning}
              </div>
            )}
            <QuizPanel questions={questions} settings={settings} />
          </div>
        )}
      </main>
      <Sidebar isOpen={showSidebar} onClose={() => setShowSidebar(false)} />
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        visualTheme={visualTheme}
        onChangeTheme={setVisualTheme}
      />
      {showStats && <StatsModal onClose={() => setShowStats(false)} />}
    </div>
  )
}

export default App
