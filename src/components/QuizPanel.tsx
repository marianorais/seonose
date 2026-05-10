import { useEffect, useMemo, useState } from 'react'
import type { QuestionItem, QuestionSettings } from '../types'
import ShareModal from './ShareModal'

interface Answer {
  questionId: number
  question: string
  userAnswer: string
  correctAnswer: string
  isCorrect: boolean
}

interface QuizPanelProps {
  questions: QuestionItem[]
  settings: QuestionSettings | null
}

const STORAGE_KEY = 'seonose-quiz-state'
const GAMES_PLAYED_KEY = 'seonose-games-played'
const RESULTS_HISTORY_KEY = 'seonose-results-history'

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const getNextIterationTime = () => {
  const now = new Date()
  const next = new Date(now)
  next.setHours(24, 0, 0, 0)
  return next
}

const formatTimeRemaining = (target: Date) => {
  const diff = Math.max(0, target.getTime() - Date.now())
  const totalSeconds = Math.floor(diff / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

const loadSavedQuizState = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as {
      currentIndex: number
      secondsLeft: number
      answer: string
      answers: Answer[]
      finished: boolean
      nextIteration: string
    }
  } catch {
    return null
  }
}

const saveQuizState = (state: {
  currentIndex: number
  secondsLeft: number
  answer: string
  answers: Answer[]
  finished: boolean
  nextIteration: string
}) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore storage errors
  }
}

const clearQuizState = () => {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore storage errors
  }
}

const incrementGamesPlayed = () => {
  try {
    const current = parseInt(window.localStorage.getItem(GAMES_PLAYED_KEY) ?? '0', 10)
    window.localStorage.setItem(GAMES_PLAYED_KEY, (current + 1).toString())
    return current + 1
  } catch {
    return 1
  }
}

const getGamesPlayed = () => {
  try {
    return parseInt(window.localStorage.getItem(GAMES_PLAYED_KEY) ?? '0', 10)
  } catch {
    return 0
  }
}

const saveResultToHistory = (answers: Answer[]) => {
  try {
    const correctCount = answers.filter((a) => a.isCorrect).length
    const result = {
      date: new Date().toISOString(),
      total: answers.length,
      correct: correctCount,
      percentage: Math.round((correctCount / answers.length) * 100),
    }
    const history = JSON.parse(window.localStorage.getItem(RESULTS_HISTORY_KEY) ?? '[]')
    history.push(result)
    window.localStorage.setItem(RESULTS_HISTORY_KEY, JSON.stringify(history))
  } catch {
    // Ignore storage errors
  }
}

const QuizPanel = ({ questions, settings }: QuizPanelProps) => {
  const savedState = typeof window !== 'undefined' ? loadSavedQuizState() : null
  const [currentIndex, setCurrentIndex] = useState<number>(savedState?.currentIndex ?? 0)
  const [secondsLeft, setSecondsLeft] = useState<number>(savedState?.secondsLeft ?? settings?.secondsPerQuestion ?? 30)
  const [answer, setAnswer] = useState<string>(savedState?.answer ?? '')
  const [answers, setAnswers] = useState<Answer[]>(savedState?.answers ?? [])
  const [finished, setFinished] = useState<boolean>(savedState?.finished ?? false)
  const [nextIteration, setNextIteration] = useState<Date>(savedState?.nextIteration ? new Date(savedState.nextIteration) : getNextIterationTime())
  const [remainingText, setRemainingText] = useState<string>(formatTimeRemaining(nextIteration))
  const [shareOpen, setShareOpen] = useState<boolean>(false)
  const [shareText, setShareText] = useState<string>('')
  const [restored, setRestored] = useState<boolean>(false)

  const currentQuestion = useMemo(() => questions[currentIndex], [questions, currentIndex])

  useEffect(() => {
    if (!settings) return
    setSecondsLeft(settings.secondsPerQuestion)
    setAnswer('')
  }, [currentIndex, settings])

  useEffect(() => {
    if (!settings || finished || !currentQuestion) return

    if (secondsLeft <= 0) {
      handleAutoNext()
      return
    }

    const timer = window.setTimeout(() => setSecondsLeft((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [secondsLeft, settings, finished, currentQuestion])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRemainingText(formatTimeRemaining(nextIteration))
    }, 1000)
    return () => window.clearInterval(interval)
  }, [nextIteration])

  useEffect(() => {
    if (!restored) {
      setRestored(true)
    }
  }, [restored])

  useEffect(() => {
    saveQuizState({
      currentIndex,
      secondsLeft,
      answer,
      answers,
      finished,
      nextIteration: nextIteration.toISOString(),
    })
  }, [currentIndex, secondsLeft, answer, answers, finished, nextIteration])

  const handleAutoNext = (selectedAnswer?: string) => {
    if (!currentQuestion || finished) return

    const userAnswer = selectedAnswer ?? answer
    const normalizedUserAnswer = normalize(userAnswer)
    const normalizedCorrectAnswer = normalize(currentQuestion.answer)
    const isCorrect = normalizedUserAnswer === normalizedCorrectAnswer

    const newAnswer: Answer = {
      questionId: currentQuestion.id,
      question: currentQuestion.question,
      userAnswer,
      correctAnswer: currentQuestion.answer,
      isCorrect,
    }

    const nextAnswers = [...answers, newAnswer]
    setAnswers(nextAnswers)

    const nextIndex = currentIndex + 1
    if (nextIndex >= questions.length) {
      saveResultToHistory(nextAnswers)
      setFinished(true)
      return
    }

    setCurrentIndex(nextIndex)
    setSecondsLeft(settings?.secondsPerQuestion ?? 30)
    setAnswer('')
  }

  const handleSubmit = () => {
    if (!currentQuestion || finished) return
    handleAutoNext()
  }

  const handleChoice = (choice: string) => {
    if (finished) return
    setAnswer(choice)
    handleAutoNext(choice)
  }

  const handleRetry = () => {
    incrementGamesPlayed()
    clearQuizState()
    setAnswers([])
    setCurrentIndex(0)
    setFinished(false)
    setSecondsLeft(settings?.secondsPerQuestion ?? 30)
    setAnswer('')
    setShareOpen(false)
    setShareText('')
    setNextIteration(getNextIterationTime())
  }

  const handleShareOpen = () => {
    const correctCount = answers.filter((a) => a.isCorrect).length
    const total = answers.length
    const gamesPlayed = getGamesPlayed() + 1
    const text = `Se o NoSe del día ${new Date().toLocaleDateString('es-ES')} #SeONose_${gamesPlayed} ${correctCount}/${total} ${window.location.origin}`
    setShareText(text)
    setShareOpen(true)
  }

  if (!settings || questions.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-600">
        Cargando preguntas...
      </div>
    )
  }

  if (finished) {
    const correctCount = answers.filter((a) => a.isCorrect).length

    return (
      <>
        <div className="w-full space-y-8">
          <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-gray-500">Resultados</p>
              <h2 className="mt-3 text-3xl font-bold text-gray-900">{correctCount} de {answers.length} correctas</h2>
              {restored && (
                <p className="mt-2 text-sm text-gray-600">Este resultado se mantiene tras recargar la página.</p>
              )}
            </div>
            <div className="rounded-3xl bg-gray-900 px-5 py-4 text-right text-white sm:text-left">
              <p className="text-xs uppercase tracking-widest text-slate-300">Próxima reiteración</p>
              <p className="mt-2 text-4xl font-bold">{remainingText}</p>
            </div>
          </div>

          <div className="space-y-4">
            {answers.map((answerItem, index) => (
              <div key={index} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-gray-600">Pregunta {index + 1}</p>
                <p className="mt-2 text-base leading-7 text-gray-900">{answerItem.question}</p>
                <div className="mt-4 space-y-3">
                  <div className="rounded-3xl bg-slate-50 p-4 text-sm">
                    <span className="font-semibold text-gray-700">Tu respuesta:</span>{' '}
                    <span className={answerItem.isCorrect ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                      {answerItem.userAnswer || '(sin respuesta)'}
                    </span>
                  </div>
                  {!answerItem.isCorrect && (
                    <div className="rounded-3xl bg-emerald-50 p-4 text-sm text-emerald-900">
                      <span className="font-semibold">Respuesta correcta:</span>{' '}
                      {answerItem.correctAnswer}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-3xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-700"
            >
              Reintentar
            </button>
            <button
              type="button"
              onClick={handleShareOpen}
              className="rounded-3xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
            >
              Compartir resultado
            </button>
          </div>
        </div>
        <ShareModal isOpen={shareOpen} onClose={() => setShareOpen(false)} shareText={shareText} />
      </>
    )
  }

  return (
    <div className="w-full space-y-6">
      <div className="text-center max-w-4xl mx-auto">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Pregunta {currentIndex + 1} de {questions.length}</p>
        <h2 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">{currentQuestion?.question}</h2>
      </div>

      <div className="flex flex-col gap-3 rounded-[2rem] bg-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-semibold text-slate-700">Tiempo restante</span>
        <span className="rounded-[1.5rem] bg-white px-4 py-3 text-3xl font-bold text-slate-900 shadow-sm">{secondsLeft}s</span>
      </div>

      {currentQuestion?.choices?.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {currentQuestion.choices.map((choice) => {
            const isSelected = answer === choice
            return (
              <button
                key={choice}
                type="button"
                onClick={() => handleChoice(choice)}
                className={`rounded-[1.75rem] border px-5 py-5 text-left text-base font-semibold leading-6 transition ${
                  isSelected
                    ? 'border-sky-600 bg-sky-50 text-slate-900 shadow-sm'
                    : 'border-slate-300 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50'
                } min-h-[5rem]`}
              >
                {choice}
              </button>
            )
          })}
        </div>
      ) : (
        <div className="space-y-3">
          <input
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleSubmit()
            }}
            className="w-full rounded-[1.75rem] border-2 border-slate-300 bg-white px-5 py-4 text-base text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            placeholder="Escribe tu respuesta..."
            autoFocus
          />
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!answer.trim()}
        className="w-full rounded-[1.75rem] bg-slate-900 px-5 py-4 text-base font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        Enviar
      </button>
    </div>
  )
}

export default QuizPanel
