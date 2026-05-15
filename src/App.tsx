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
  { id: 1, question: '¿Cuál es la moneda oficial de Japón?', answer: 'Yen', choices: ['Dólar', 'Yen', 'Euro'] },
  { id: 2, question: '¿Quién escribió "Cien años de soledad"?', answer: 'Gabriel García Márquez', choices: ['Juan Rulfo', 'Gabriel García Márquez', 'Mario Vargas Llosa'] },
  { id: 3, question: '¿Qué elemento tiene el número atómico 6?', answer: 'Carbono', choices: ['Oxígeno', 'Carbono', 'Hidrógeno'] },
  { id: 4, question: '¿En qué año llegó el hombre a la Luna?', answer: '1969', choices: ['1969', '1972', '1959'] },
  { id: 5, question: '¿Qué país tiene 11 idiomas oficiales?', answer: 'Sudáfrica', choices: ['India', 'Sudáfrica', 'Canadá'] },
  { id: 6, question: '¿Cuál es el cuarto planeta desde el Sol?', answer: 'Marte', choices: ['Venus', 'Marte', 'Júpiter'] },
  { id: 7, question: '¿Cuál es el idioma oficial de Brasil?', answer: 'Portugués', choices: ['Español', 'Portugués', 'Inglés'] },
  { id: 8, question: '¿Qué océano es el más grande del planeta?', answer: 'Pacífico', choices: ['Atlántico', 'Índico', 'Pacífico'] },
  { id: 9, question: '¿Quién escribió "El Principito"?', answer: 'Antoine de Saint-Exupéry', choices: ['Victor Hugo', 'Antoine de Saint-Exupéry', 'Émile Zola'] },
  { id: 10, question: '¿Cuál es la capital de Australia?', answer: 'Canberra', choices: ['Sidney', 'Melbourne', 'Canberra'] },
]

const QUESTIONS_PER_GAME = 5

const normalizeString = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const ensureThreeChoices = (question: QuestionItem) => {
  const answer = question.answer.trim()
  const sourceChoices = Array.from(
    new Set(
      (question.choices ?? [])
        .map((choice) => choice.trim())
        .filter(Boolean)
    )
  )

  if (!sourceChoices.some((choice) => normalizeString(choice) === normalizeString(answer))) {
    sourceChoices.unshift(answer)
  }

  const otherChoices = sourceChoices.filter((choice) => normalizeString(choice) !== normalizeString(answer)).slice(0, 2)
  const fallbackDistractors = [
    'Londres',
    'Berlín',
    'Madrid',
    'Cinco',
    'Ocho',
    'Nueve',
    'Venus',
    'Júpiter',
    'Saturno',
    'Europa',
    'África',
    'Rojo',
    'Verde',
    'Amarillo',
  ]

  const paddedChoices = [...otherChoices]
  let padIndex = 0
  while (paddedChoices.length < 2 && padIndex < fallbackDistractors.length) {
    const distractor = fallbackDistractors[padIndex++]
    if (!paddedChoices.some((choice) => normalizeString(choice) === normalizeString(distractor)) && normalizeString(distractor) !== normalizeString(answer)) {
      paddedChoices.push(distractor)
    }
  }

  const finalChoices = [answer, ...paddedChoices].slice(0, 4)
  return {
    ...question,
    choices: finalChoices.sort(() => Math.random() - 0.5),
  }
}

const getTodayKey = () => new Date().toISOString().slice(0, 10)

const createSeedFromString = (value: string) => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(i)
  }
  return hash
}

const shuffleWithSeed = <T,>(items: T[], seedSource: string) => {
  const shuffled = [...items]
  const seed = createSeedFromString(seedSource)
  let randomSeed = seed

  const random = () => {
    randomSeed = Math.imul(randomSeed ^ (randomSeed >>> 15), randomSeed | 1)
    randomSeed ^= randomSeed + Math.imul(randomSeed ^ (randomSeed >>> 7), randomSeed | 61)
    return ((randomSeed ^ (randomSeed >>> 14)) >>> 0) / 4294967296
  }

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled
}

const selectDailyQuestions = (questions: QuestionItem[], dateKey: string, count: number) => {
  const maxQuestions = Math.min(count, QUESTIONS_PER_GAME)
  const shuffled = shuffleWithSeed(questions, dateKey)
  return shuffled.slice(0, Math.min(maxQuestions, shuffled.length)).map(ensureThreeChoices)
}

function App() {
  const [showStats, setShowStats] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [visualTheme, setVisualTheme] = useState<VisualTheme>(() => {
    const savedTheme = window.localStorage.getItem('seonose-theme') as VisualTheme | null
    if (savedTheme === 'dark' || savedTheme === 'black' || savedTheme === 'blue' || savedTheme === 'sepia' || savedTheme === 'light') {
      return savedTheme
    }
    return 'light'
  })
  const [questions, setQuestions] = useState<QuestionItem[]>([])
  const [allQuestions, setAllQuestions] = useState<QuestionItem[]>([])
  const [questionDate, setQuestionDate] = useState<string>(getTodayKey())
  const [settings, setSettings] = useState<QuestionSettings | null>(null)
  const [loading, setLoading] = useState(true)

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

        const todayKey = getTodayKey()
        setSettings(settingsData)
        setAllQuestions(questionsData)
        setQuestionDate(todayKey)
        setQuestions(selectDailyQuestions(questionsData, todayKey, settingsData.questionsPerDay))
      } catch (exception) {
        console.error(exception)
        console.log('No se pudo conectar al backend. Usando datos locales de demo.')
        const todayKey = getTodayKey()
        setSettings(FALLBACK_SETTINGS)
        setAllQuestions(FALLBACK_QUESTIONS)
        setQuestionDate(todayKey)
        setQuestions(selectDailyQuestions(FALLBACK_QUESTIONS, todayKey, FALLBACK_SETTINGS.questionsPerDay))
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  useEffect(() => {
    if (!settings || allQuestions.length === 0) return

    const interval = window.setInterval(() => {
      const todayKey = getTodayKey()
      if (todayKey !== questionDate) {
        setQuestionDate(todayKey)
        setQuestions(selectDailyQuestions(allQuestions, todayKey, settings.questionsPerDay))
      }
    }, 1000)

    return () => window.clearInterval(interval)
  }, [allQuestions, questionDate, settings])

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
            <QuizPanel questions={questions} settings={settings} questionDate={questionDate} />
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
