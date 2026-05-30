import { useEffect, useState } from 'react'
import Header from './components/Header'
import QuizPanel from './components/QuizPanel'
import Sidebar from './components/Sidebar'
import SettingsModal from './components/SettingsModal'
import StatsModal from './components/StatsModal'
import type { QuestionItem, QuestionSettings, GameSettings } from './types'
import { supabase } from './lib/supabase'


type VisualTheme = 'light' | 'dark' | 'black' | 'blue' | 'sepia'

const FALLBACK_SETTINGS: QuestionSettings = {
  questionsPerDay: 5,
  secondsPerQuestion: 30,
}

// LocalStorage donde se guardan las configuraciones personalizadas
const SETTINGS_STORAGE_KEY_QUESTIONS = 'seonose-custom-settings-questions'

// Flag temporal para usar o no backend
const use_database = true

const FALLBACK_QUESTIONS: QuestionItem[] = [
  { id: 1, question: '¿Cuál es la capital de Nigeria?', answer: 'Abuya', choices: ['Lagos', 'Abuya', 'Kano'] },
  { id: 2, question: '¿En qué año terminó la Segunda Guerra Mundial?', answer: '1945', choices: ['1945', '1939', '1950'] },
  { id: 3, question: '¿Cuál es el metal más abundante en la corteza terrestre?', answer: 'Aluminio', choices: ['Hierro', 'Cobre', 'Aluminio'] },
  { id: 4, question: '¿Qué océano es el más pequeño?', answer: 'Ártico', choices: ['Pacífico', 'Atlántico', 'Ártico'] },
  { id: 5, question: '¿Qué vitamina se obtiene principalmente del sol?', answer: 'Vitamina D', choices: ['Vitamina C', 'Vitamina B12', 'Vitamina D'] },
  { id: 6, question: '¿Qué científico formuló la teoría de la relatividad general?', answer: 'Albert Einstein', choices: ['Isaac Newton', 'Nikola Tesla', 'Albert Einstein'] },
  { id: 7, question: '¿Cuál es el elemento químico con símbolo W?', answer: 'Wolframio', choices: ['Titanio', 'Wolframio', 'Platino'] },
  { id: 8, question: '¿En qué año cayó el Imperio Romano de Occidente?', answer: '476', choices: ['410', '1453', '476'] },
  { id: 9, question: '¿Qué país ganó el Mundial de fútbol de 2010?', answer: 'España', choices: ['Alemania', 'Argentina', 'España'] },
  { id: 10, question: '¿Qué matemático desarrolló el cálculo diferencial junto con Leibniz?', answer: 'Isaac Newton', choices: ['Pitágoras', 'Isaac Newton', 'Euler'] },
  { id: 11, question: '¿Qué lenguaje se utiliza principalmente para desarrollar Android nativo?', answer: 'Kotlin', choices: ['Swift', 'JavaScript', 'Kotlin'] },
  { id: 12, question: '¿Cuál es el hueso más largo del cuerpo humano?', answer: 'Fémur', choices: ['Tibia', 'Húmero', 'Fémur'] },
  { id: 13, question: '¿Qué civilización construyó Machu Picchu?', answer: 'Inca', choices: ['Maya', 'Azteca', 'Inca'] },
  { id: 14, question: '¿Cuál es la velocidad aproximada de la luz?', answer: '300000 km/s', choices: ['150000 km/s', '300000 km/s', '100000 km/s'] },
  { id: 15, question: '¿Qué planeta tiene más lunas conocidas?', answer: 'Saturno', choices: ['Júpiter', 'Marte', 'Saturno'] },
  { id: 16, question: '¿Quién escribió "Cien años de soledad"?', answer: 'Gabriel García Márquez', choices: ['Mario Vargas Llosa', 'Pablo Neruda', 'Gabriel García Márquez'] },
  { id: 17, question: '¿Qué estructura celular contiene el ADN?', answer: 'Núcleo', choices: ['Mitocondria', 'Núcleo', 'Ribosoma'] },
  { id: 18, question: '¿Cuál es el país más grande del mundo?', answer: 'Rusia', choices: ['Canadá', 'China', 'Rusia'] },
  { id: 19, question: '¿Qué filósofo dijo "Pienso, luego existo"?', answer: 'René Descartes', choices: ['Platón', 'Aristóteles', 'René Descartes'] },
  { id: 20, question: '¿Qué país tiene más husos horarios?', answer: 'Francia', choices: ['Rusia', 'Estados Unidos', 'Francia'] },
  { id: 21, question: '¿Cuál es la moneda oficial de Suiza?', answer: 'Franco suizo', choices: ['Euro', 'Corona', 'Franco suizo'] },
  { id: 22, question: '¿Qué científico descubrió la penicilina?', answer: 'Alexander Fleming', choices: ['Louis Pasteur', 'Alexander Fleming', 'Darwin'] },
  { id: 23, question: '¿Cuál es el país con mayor cantidad de volcanes activos?', answer: 'Indonesia', choices: ['Japón', 'Chile', 'Indonesia'] },
  { id: 24, question: '¿Qué físico propuso las leyes del movimiento?', answer: 'Isaac Newton', choices: ['Albert Einstein', 'Isaac Newton', 'Stephen Hawking'] },
  { id: 25, question: '¿Cuál es el órgano más grande del cuerpo humano?', answer: 'La piel', choices: ['El hígado', 'El corazón', 'La piel'] },
  { id: 26, question: '¿Cuál es la capital de Kazajistán?', answer: 'Astaná', choices: ['Taskent', 'Bakú', 'Astaná'] },
  { id: 27, question: '¿Qué planeta tarda más tiempo en dar una vuelta al Sol?', answer: 'Neptuno', choices: ['Saturno', 'Urano', 'Neptuno'] },
  { id: 28, question: '¿Cuál es el idioma más hablado del mundo por hablantes nativos?', answer: 'Chino mandarín', choices: ['Inglés', 'Español', 'Chino mandarín'] },
  { id: 29, question: '¿Qué científico desarrolló la teoría de la evolución?', answer: 'Charles Darwin', choices: ['Gregor Mendel', 'Charles Darwin', 'Louis Pasteur'] },
  { id: 30, question: '¿Qué país tiene la ciudad más poblada del mundo?', answer: 'Japón', choices: ['China', 'India', 'Japón'] },
  { id: 31, question: '¿Cuál es el único mamífero capaz de volar?', answer: 'Murciélago', choices: ['Ardilla voladora', 'Murciélago', 'Cóndor'] },
  { id: 32, question: '¿Qué país inventó el papel?', answer: 'China', choices: ['Egipto', 'Grecia', 'China'] },
  { id: 33, question: '¿Cuál es el océano más profundo del planeta?', answer: 'Pacífico', choices: ['Atlántico', 'Índico', 'Pacífico'] },
  { id: 34, question: '¿Qué elemento químico tiene el número atómico 79?', answer: 'Oro', choices: ['Plata', 'Cobre', 'Oro'] },
  { id: 35, question: '¿Qué país tiene forma de bota?', answer: 'Italia', choices: ['Grecia', 'Portugal', 'Italia'] },
]

// const QUESTIONS_PER_GAME = 5

const normalizeString = (value?: string) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const ensureThreeChoices = (question: QuestionItem) => {
  const answer = (question.answer ?? '').trim()

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

  const otherChoices = sourceChoices
    .filter((choice) => normalizeString(choice) !== normalizeString(answer))
    .slice(0, 2)

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

    if (
      !paddedChoices.some((choice) => normalizeString(choice) === normalizeString(distractor)) &&
      normalizeString(distractor) !== normalizeString(answer)
    ) {
      paddedChoices.push(distractor)
    }
  }

  const finalChoices = [answer, ...paddedChoices].slice(0, 4)

  return {
    ...question,
    choices: finalChoices.sort(() => Math.random() - 0.5),
  }
}
const getTodayKey = () => {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone:
        'America/Argentina/Buenos_Aires',
    }
  ).format(new Date())
}

// Carga configuraciones guardadas o usa defaults
const loadCustomSettings =
  (): QuestionSettings => {
    try {
      const raw =
        window.localStorage.getItem(
          SETTINGS_STORAGE_KEY_QUESTIONS
        )

      if (!raw) {
        return FALLBACK_SETTINGS
      }

      const parsed =
        JSON.parse(
          raw
        ) as Partial<QuestionSettings>

      return {
        questionsPerDay:
          Number(
            parsed.questionsPerDay
          ) ||
          FALLBACK_SETTINGS.questionsPerDay,

        secondsPerQuestion:
          Number(
            parsed.secondsPerQuestion
          ) ||
          FALLBACK_SETTINGS.secondsPerQuestion,
      }
    } catch {
      return FALLBACK_SETTINGS
    }
}

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

const selectDailyQuestions = (
  questions: QuestionItem[],
  dateKey: string,
  count: number
) => {
  // Respeta la cantidad configurada por localStorage
  const maxQuestions = Math.min(count, questions.length)

  const shuffled = shuffleWithSeed(questions, dateKey)

  return shuffled
    .slice(0, Math.min(maxQuestions, shuffled.length))
    .map(ensureThreeChoices)
}

function App() {
  const [showStats, setShowStats] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null)

  const [visualTheme, setVisualTheme] = useState<VisualTheme>(() => {
    const savedTheme = window.localStorage.getItem('seonose-theme') as VisualTheme | null

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

  const [questions, setQuestions] = useState<QuestionItem[]>([])
  const [allQuestions, setAllQuestions] = useState<QuestionItem[]>([])
  const [questionDate, setQuestionDate] = useState<string>(getTodayKey())
  const [settings, setSettings] = useState<QuestionSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.localStorage.setItem('seonose-theme', visualTheme)
  }, [visualTheme])

  useEffect(() => {
    if (!gameSettings) {
      return
    }
    document.body.style.fontFamily = gameSettings.fontfamily || 'sans-serif'
  }, [gameSettings])

  useEffect(() => {
    //const baseUrl = import.meta.env.VITE_API_BASE_URL ?? ''
    //console.log(import.meta.env.VITE_SUPABASE_URL)
    const loadData = async () => {
      try {
        // Configuración final que usará el juego
        let finalSettings = loadCustomSettings()

        // Si en algún momento querés usar backend
       if (use_database) {
          const { data, error } = await supabase
            .from('questions')
            .select('*')
          
            console.log('ERROR:')
            console.log(error)

            console.log('RAW SUPABASE DATA:')
            console.log(JSON.stringify(data, null, 2))

          if (!error && data && data.length > 0) {
            type SupabaseQuestion = {
              id: number
              question: string
              answer: string
              choices: string[] | null
              availablefrom?: string
              enabled?: boolean
            }

            const questionsData: QuestionItem[] = data.map(
              (item: SupabaseQuestion) => ({
                id: item.id,
                question: item.question,
                answer: item.answer,
                choices: item.choices ?? [],
                availablefrom: item.availablefrom,
                enabled: item.enabled,
              })
            )

            
            const { data: gameSettings } =
              await supabase
                .from('game_settings')
                .select('*')
                .single()
            const customSettings = loadCustomSettings()

            if (gameSettings) {setGameSettings(gameSettings)}

            finalSettings = {
              questionsPerDay:
                gameSettings?.questionspergame ?? customSettings.questionsPerDay ?? FALLBACK_SETTINGS.questionsPerDay,

              secondsPerQuestion:
                gameSettings?.secondsperquestion  ?? customSettings.secondsPerQuestion ?? FALLBACK_SETTINGS.secondsPerQuestion,
            }
            console.log('GAME SETTINGS FROM SUPABASE:', gameSettings ?? 'No game settings found, using custom/local settings')
            const todayKey = getTodayKey()

            const validQuestions: QuestionItem[] = questionsData
              .filter(
                (q) =>
                  typeof q.question === 'string' &&
                  typeof q.answer === 'string' &&
                  q.enabled && (!q.availablefrom || q.availablefrom.slice(0,10) === todayKey)
              )
              .map((q) => ({
                id: q.id,
                question: q.question ?? '',
                answer: q.answer ?? '',
                choices: Array.isArray(q.choices)
                  ? q.choices.filter(
                      (choice): choice is string =>
                        typeof choice === 'string'
                    )
                  : [],
              }))
            console.log('VALID QUESTIONS:')
            console.log(JSON.stringify(validQuestions, null, 2))
            setSettings(finalSettings)
            setAllQuestions(validQuestions)
            setQuestionDate(todayKey)

            setQuestions(
              selectDailyQuestions(
                validQuestions,
                todayKey,
                finalSettings.questionsPerDay
              )
            )

            console.log('Preguntas cargadas desde Supabase')

            return
          }

          console.error('Error cargando Supabase:', error)
        }

        // Fallback local
        console.log('Usando preguntas locales de demo.')

        const todayKey = getTodayKey()

        setSettings(finalSettings)
        setAllQuestions(FALLBACK_QUESTIONS)
        setQuestionDate(todayKey)

        setQuestions(
          selectDailyQuestions(
            FALLBACK_QUESTIONS,
            todayKey,
            finalSettings.questionsPerDay
          )
        )
      } catch (exception) {
        console.error(exception)

        // Si algo falla, usa local
        const finalSettings = loadCustomSettings()
        const todayKey = getTodayKey()

        setSettings(finalSettings)
        setAllQuestions(FALLBACK_QUESTIONS)
        setQuestionDate(todayKey)

        setQuestions(
          selectDailyQuestions(
            FALLBACK_QUESTIONS,
            todayKey,
            finalSettings.questionsPerDay
          )
        )
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Cambia automáticamente las preguntas cuando cambia el día
  useEffect(() => {
    
    if (!settings || allQuestions.length === 0) {
      return
    }

    const interval = window.setInterval(() => {
      const todayKey = getTodayKey()

      if (todayKey !== questionDate) {
        setQuestionDate(todayKey)

        setQuestions(
          selectDailyQuestions(
            allQuestions,
            todayKey,
            settings.questionsPerDay
          )
        )
      }
    }, 1000)

    return () => window.clearInterval(interval)
  }, [allQuestions, questionDate, settings])

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{
        backgroundColor: gameSettings?.backgroundcolor ?? '#f8fafc',

        fontFamily: gameSettings?.fontfamily ?? 'sans-serif',
      }}
    >
      <Header
        onOpenSidebar={() => setShowSidebar(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenStats={() => setShowStats(true)}
      />

      <main className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center px-4 py-8 lg:px-8">
        {loading ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-600">
            Cargando contenido...
          </div>
        ) : (
          <div className="w-full space-y-4">
            <QuizPanel
              questions={questions}
              settings={settings}
              questionDate={questionDate}
            />
          </div>
        )}
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
        <StatsModal onClose={() => setShowStats(false)} />
      )}
    </div>
  )
}

export default App
