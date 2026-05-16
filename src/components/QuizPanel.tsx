import { useEffect, useMemo, useRef, useState } from 'react'
import type { QuestionItem, QuestionSettings } from '../types'
import ShareModal from './ShareModal'

interface Answer {
  questionId: number
  question: string
  userAnswer: string
  correctAnswer: string
  isCorrect: boolean
  responseTime: number
}

interface QuizPanelProps {
  questions: QuestionItem[]
  settings: QuestionSettings | null
  questionDate: string
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

const getTodayKey = () => new Date().toISOString().slice(0, 10)

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

    const parsed = JSON.parse(raw) as {
      currentIndex: number
      secondsLeft: number
      answer: string
      answers: Answer[]
      finished: boolean
      nextIteration: string
      gameNumber?: number
      showFeedback?: boolean
      isTimeout?: boolean
      date: string
    }

    if (parsed.date !== getTodayKey()) return null
    return parsed
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
  gameNumber: number
  showFeedback: boolean
  isTimeout: boolean
}) => {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        date: getTodayKey(),
      })
    )
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

const QuizPanel = ({ questions, settings, questionDate }: QuizPanelProps) => {
  const savedState = typeof window !== 'undefined' ? loadSavedQuizState() : null
  const [currentIndex, setCurrentIndex] = useState<number>(savedState?.currentIndex ?? 0)
  const [secondsLeft, setSecondsLeft] = useState<number>(savedState?.secondsLeft ?? settings?.secondsPerQuestion ?? 30)
  const [answers, setAnswers] = useState<Answer[]>(savedState?.answers ?? [])
  const [finished, setFinished] = useState<boolean>(savedState?.finished ?? false)
  const [nextIteration, setNextIteration] = useState<Date>(savedState?.nextIteration ? new Date(savedState.nextIteration) : getNextIterationTime())
  const [remainingText, setRemainingText] = useState<string>(formatTimeRemaining(nextIteration))
  const [shareOpen, setShareOpen] = useState<boolean>(false)
  const [shareText, setShareText] = useState<string>('')
  const [restored, setRestored] = useState<boolean>(false)
  const [gameNumber, setGameNumber] = useState<number>(savedState?.gameNumber ?? getGamesPlayed() + 1)
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now())
  const [showFeedback, setShowFeedback] = useState<boolean>(savedState?.showFeedback ?? false)
  const [tempAnswer, setTempAnswer] = useState<string>(savedState?.answer ?? '')
  const [isTimeout, setIsTimeout] = useState<boolean>(savedState?.isTimeout ?? false)
  const finishRecordedRef = useRef<boolean>(savedState?.finished ?? false)
  // const initialLoadRef = useRef(true)
  // 🔧 CAMBIO 1: Añadido para rastrear cambios de día
  const previousQuestionDateRef = useRef<string | null>(null)

  const currentQuestion = useMemo(() => questions[currentIndex], [questions, currentIndex])

  const getResultOptions = (answerItem: Answer) => {
    const question = questions.find((item) => item.id === answerItem.questionId)
    const rawChoices = question?.choices ?? [answerItem.correctAnswer]
    return Array.from(new Set(rawChoices.map((choice) => choice.trim()))).filter(Boolean)
  }

  useEffect(() => {
    if (!settings) return
    setSecondsLeft(settings.secondsPerQuestion)
    setQuestionStartTime(Date.now())
  }, [currentIndex, settings])

  const resetQuiz = () => {
    window.localStorage.removeItem(STORAGE_KEY)
    clearQuizState()
    setAnswers([])
    setCurrentIndex(0)
    setFinished(false)
    setSecondsLeft(settings?.secondsPerQuestion ?? 30)
    setTempAnswer('')
    setShowFeedback(false)
    setIsTimeout(false)
    setShareOpen(false)
    setShareText('')
    setNextIteration(getNextIterationTime())
    setGameNumber(getGamesPlayed() + 1)
    setQuestionStartTime(Date.now())
    finishRecordedRef.current = false
  }

  // 🔧 CAMBIO 2: Reemplazado el useEffect problemático
  useEffect(() => {
    if (!settings) return
    
    // Solo resetear si el questionDate realmente cambió
    if (previousQuestionDateRef.current === null) {
      // Primera ejecución, guardar la fecha actual
      previousQuestionDateRef.current = questionDate
      return
    }
    
    // Solo resetear si cambió el día (fecha diferente)
    if (previousQuestionDateRef.current !== questionDate) {
      previousQuestionDateRef.current = questionDate
      resetQuiz()
    }
  }, [questionDate, settings])

  useEffect(() => {
    if (!settings || finished || !currentQuestion || showFeedback) return

    if (secondsLeft <= 0) {
      handleTimeout()
      return
    }

    const timer = window.setTimeout(() => setSecondsLeft((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [secondsLeft, settings, finished, currentQuestion, showFeedback])

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

  // Auto-increment counter if no answers were given and reached 00:00:00
  useEffect(() => {
    if (!finished && remainingText === '00:00:00' && answers.length === 0) {
      const recordedNumber = incrementGamesPlayed()
      setGameNumber(recordedNumber)
      resetQuiz()
    }
  }, [remainingText, finished, answers.length])

  useEffect(() => {
    saveQuizState({
      currentIndex,
      secondsLeft,
      answer: tempAnswer,
      answers,
      finished,
      nextIteration: nextIteration.toISOString(),
      gameNumber,
      showFeedback,
      isTimeout,
    })
  }, [currentIndex, secondsLeft, answers, finished, nextIteration, gameNumber, showFeedback, tempAnswer, isTimeout])

  const handleTimeout = () => {
    if (!currentQuestion || finished || showFeedback) return
    setIsTimeout(true)
    setTempAnswer('')
    setShowFeedback(true)
  }

  const handleNext = () => {
    if (!currentQuestion || !showFeedback) return

    const userAnswer = tempAnswer
    const normalizedUserAnswer = normalize(userAnswer)
    const normalizedCorrectAnswer = normalize(currentQuestion.answer)
    const isCorrect = normalizedUserAnswer === normalizedCorrectAnswer
    const responseTime = Math.floor((Date.now() - questionStartTime) / 1000)

    const newAnswer: Answer = {
      questionId: currentQuestion.id,
      question: currentQuestion.question,
      userAnswer,
      correctAnswer: currentQuestion.answer,
      isCorrect,
      responseTime,
    }

    const nextAnswers = [...answers, newAnswer]
    setAnswers(nextAnswers)

    const nextIndex = currentIndex + 1
    if (nextIndex >= questions.length) {
      // Game is finished, save results and show them
      saveResultToHistory(nextAnswers)
      setFinished(true)
      return
    }

    setCurrentIndex(nextIndex)
    setSecondsLeft(settings?.secondsPerQuestion ?? 30)
    setTempAnswer('')
    setShowFeedback(false)
    setIsTimeout(false)
    setQuestionStartTime(Date.now())
  }

  const handleChoice = (choice: string) => {
    if (finished || showFeedback) return
    setTempAnswer(choice)
    setShowFeedback(true)
  }

  const handleRetry = () => {
    resetQuiz()
  }

  const handleShareOpen = () => {
    const correctCount = answers.filter((a) => a.isCorrect).length
    const total = answers.length
    const text = `Se o NoSe #${gameNumber} ${correctCount}/${total} ${window.location.origin}`
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
    const totalResponseTime = answers.reduce((sum, a) => sum + a.responseTime, 0)
    const averageResponseTime = answers.length > 0 ? Math.round(totalResponseTime / answers.length) : 0

    return (
      <>
        <div className="w-full space-y-8">
          <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-gray-500">Resultados</p>
              <h2 className="mt-3 text-3xl font-bold text-gray-900">{correctCount} de {answers.length} correctas</h2>
              <p className="mt-1 text-sm text-gray-600">Tiempo promedio por respuesta: {averageResponseTime}s</p>
            </div>
            <div className="rounded-3xl bg-gray-900 px-5 py-4 text-right text-white sm:text-left">
              <p className="text-xs uppercase tracking-widest text-slate-300">Próxima reiteración</p>
              <p className="mt-2 text-4xl font-bold">{remainingText}</p>
            </div>
          </div>

          <div className="space-y-4">
            {answers.map((answerItem, index) => {
              const answerOptions = getResultOptions(answerItem)
              return (
                <div key={index} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-semibold text-gray-600">Pregunta {index + 1}</p>
                  <p className="mt-2 text-base leading-7 text-gray-900">{answerItem.question}</p>
                  <div className="mt-4 space-y-4">
                    <div className="rounded-3xl bg-slate-50 p-4 text-sm">
                      <span className="font-semibold text-gray-700">Tu respuesta:</span>{' '}
                      <span className={answerItem.isCorrect ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                        {answerItem.isCorrect ? '✓ ' : '✗ '}
                        {answerItem.userAnswer || '(sin respuesta)'}
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {answerOptions.map((option) => {
                        const isSelected = normalize(option) === normalize(answerItem.userAnswer)
                        const isCorrectOption = normalize(option) === normalize(answerItem.correctAnswer)
                        const optionClasses = 'border-slate-200 bg-slate-50 text-slate-600'

                        return (
                          <div key={option} className={`rounded-3xl border p-4 text-sm font-semibold ${optionClasses}`}>
                            <div className="flex items-center justify-between gap-2">
                              <span>{option}</span>
                              {isCorrectOption && <span className="text-green-600 font-bold">✓</span>}
                              {isSelected && !isCorrectOption && <span className="text-red-600 font-bold">✗</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
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

      <div className="grid gap-3 md:grid-cols-2">
        {currentQuestion.choices?.map((choice) => {
          const isSelected = normalize(choice) === normalize(tempAnswer)
          return (
            <button
              key={choice}
              type="button"
              onClick={() => handleChoice(choice)}
              disabled={showFeedback}
              className={`rounded-[1.75rem] border px-5 py-5 text-left text-base font-semibold leading-6 transition ${
                isSelected
                  ? 'border-sky-600 bg-sky-50 text-slate-900 shadow-sm'
                  : 'border-slate-300 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50'
              } min-h-[5rem] ${showFeedback ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              {choice}
            </button>
          )
        })}
      </div>

      {showFeedback && (
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">
                {normalize(tempAnswer) === normalize(currentQuestion.answer) ? '¡Correcto!' : 'Incorrecto'}
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Tu respuesta: <span className={normalize(tempAnswer) === normalize(currentQuestion.answer) ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                  {tempAnswer || 'Sin respuesta'}
                </span>
              </p>
              {normalize(tempAnswer) !== normalize(currentQuestion.answer) && (
                <p className="mt-2 text-sm text-gray-600">
                  Respuesta correcta: <span className="text-green-600 font-semibold">{currentQuestion.answer}</span>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleNext}
              className="w-full rounded-[1.75rem] bg-slate-900 px-5 py-4 text-base font-semibold text-white transition hover:bg-slate-700"
            >
              {currentIndex + 1 >= questions.length ? 'Ver resultados' : 'Siguiente pregunta'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default QuizPanel