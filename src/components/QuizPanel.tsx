import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { QuestionItem, QuestionSettings } from '../types'
import ShareModal from './ShareModal'
import { supabase } from '../lib/supabase'

import { getClientInfo } from '../lib/userSession'
import {
  normalizar,
  obtenerNumeroPartida,
  obtenerSiguienteIteracion,
  formatearTiempoRestante,
  cargarEstadoGuardado,
  guardarEstadoQuiz,
  limpiarEstadoQuiz,
  guardarResultadoEnHistorial,
} from '../lib/quizHelpers'

type SavedQuizState = {
  currentIndex?: number
  secondsLeft?: number
  answers?: Answer[]
  finished?: boolean
  nextIteration?: string
  showFeedback?: boolean
  answer?: string
  isTimeout?: boolean
  gameNumber?: number
}

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
  allowReplay: boolean
}

/**
 * `QuizPanel` - Presenta las preguntas, maneja el estado de la partida
 * y guarda resultados en `localStorage` y Supabase. Mantiene la lógica
 * original, solo se ha modularizado el código.
 */
const QuizPanel = ({ questions, settings, questionDate, allowReplay }: QuizPanelProps) => {
    const savedState = typeof window !== 'undefined' ? cargarEstadoGuardado<SavedQuizState>() : null

    const gameNumber = useMemo(() => obtenerNumeroPartida(), [])

    const [currentIndex, setCurrentIndex] = useState<number>(savedState?.currentIndex ?? 0)
    const [secondsLeft, setSecondsLeft] = useState<number>(savedState?.secondsLeft ?? settings?.secondsPerQuestion ?? 30)
    const [answers, setAnswers] = useState<Answer[]>(savedState?.answers ?? [])
    const [finished, setFinished] = useState<boolean>(savedState?.finished ?? false)
    const [nextIteration, setNextIteration] = useState<Date>(savedState?.nextIteration ? new Date(savedState.nextIteration) : obtenerSiguienteIteracion())
    const [remainingText, setRemainingText] = useState<string>(formatearTiempoRestante(nextIteration))

    const [shareOpen, setShareOpen] = useState<boolean>(false)
    const [shareText, setShareText] = useState<string>('')

    const [questionStartTime, setQuestionStartTime] = useState<number>(() => Date.now())
    const [showFeedback, setShowFeedback] = useState<boolean>(savedState?.showFeedback ?? false)
    const [tempAnswer, setTempAnswer] = useState<string>(savedState?.answer ?? '')
    const [isTimeout, setIsTimeout] = useState<boolean>(savedState?.isTimeout ?? false)

    const finishRecordedRef = useRef<boolean>(savedState?.finished ?? false)
    const previousQuestionDateRef = useRef<string | null>(null)

    const currentQuestion = useMemo(() => questions[currentIndex], [questions, currentIndex])

    const saveCompletedGame = async (finalAnswers: Answer[]) => {
      try {
        const clientInfo = await getClientInfo()

        if (!clientInfo.ip) {
          console.warn('No se pudo obtener IP')
          return
        }

        const correctCount = finalAnswers.filter((a) => a.isCorrect).length

        const { data: gameSession, error: sessionError } = await supabase.from('game_sessions').insert({
          startedat: new Date().toISOString(),
          completedat: new Date().toISOString(),
          totalquestions: finalAnswers.length,
          correctanswers: correctCount,
          userip: clientInfo.ip,
          useragent: clientInfo.userAgent,
        }).select().single()

        if (sessionError || !gameSession) {
          console.error('Error creando sesión', sessionError)
          return
        }

        const answersToInsert = finalAnswers.map((answer) => ({
          gamesessionid: gameSession.id,
          questionid: answer.questionId,
          selectedanswer: answer.userAnswer,
          correctanswer: answer.correctAnswer,
          iscorrect: answer.isCorrect,
          responsetime: answer.responseTime,
        }))

        const { error: answersError } = await supabase.from('game_answers').insert(answersToInsert)

        if (answersError) console.error(answersError)
      } catch (error) {
        console.error(error)
      }
    }

    const getResultOptions = (answerItem: Answer) => {
      const question = questions.find((item) => item.id === answerItem.questionId)

      const rawChoices = question?.choices ?? [answerItem.correctAnswer]

      return Array.from(new Set(rawChoices.map((choice) => choice.trim()))).filter(Boolean)
    }

    const resetQuiz = useCallback(() => {
      limpiarEstadoQuiz()
      setAnswers([])
      setCurrentIndex(0)
      setFinished(false)
      setSecondsLeft(settings?.secondsPerQuestion ?? 30)
      setTempAnswer('')
      setShowFeedback(false)
      setIsTimeout(false)
      setShareOpen(false)
      setShareText('')
      setNextIteration(obtenerSiguienteIteracion())
      setQuestionStartTime(Date.now())
      finishRecordedRef.current = false
    }, [
      settings,
      setAnswers,
      setCurrentIndex,
      setFinished,
      setSecondsLeft,
      setTempAnswer,
      setShowFeedback,
      setIsTimeout,
      setShareOpen,
      setShareText,
      setNextIteration,
      setQuestionStartTime,
    ])

    useEffect(() => {
      if (!settings) return

      if (previousQuestionDateRef.current === null) {
        previousQuestionDateRef.current = questionDate
        return
      }

      if (previousQuestionDateRef.current !== questionDate) {
        previousQuestionDateRef.current = questionDate
        resetQuiz()
      }
    }, [questionDate, settings, resetQuiz])

    useEffect(() => {
      if (!settings || finished || !currentQuestion || showFeedback) return

      const timer = window.setTimeout(() => {
        if (secondsLeft <= 0) {
          setIsTimeout(true)
          setTempAnswer('')
          setShowFeedback(true)
          return
        }

        setSecondsLeft((v) => v - 1)
      }, 1000)

      return () => window.clearTimeout(timer)
    }, [secondsLeft, settings, finished, currentQuestion, showFeedback])

    useEffect(() => {
      const interval = window.setInterval(() => setRemainingText(formatearTiempoRestante(nextIteration)), 1000)
      return () => window.clearInterval(interval)
    }, [nextIteration])

    useEffect(() => {
      guardarEstadoQuiz({
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

    const handleNext = async () => {
      if (!currentQuestion || !showFeedback) return

      const userAnswer = tempAnswer
      const normalizedUserAnswer = normalizar(userAnswer)
      const normalizedCorrectAnswer = normalizar(currentQuestion.answer)
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
        guardarResultadoEnHistorial(nextAnswers)
        await saveCompletedGame(nextAnswers)
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

    const handleRetry = () => resetQuiz()

    const handleShareOpen = () => {
      const correctCount = answers.filter((a) => a.isCorrect).length
      const total = answers.length
      const text = [`🧠 Se o NoSe #${gameNumber} ${correctCount}/${total}`, `👉 ${window.location.origin}`].join('\n')
      setShareText(text)
      setShareOpen(true)
    }

    if (!settings || questions.length === 0) {
      return <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-600">Cargando preguntas...</div>
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
                <p className="mt-1 text-sm text-gray-600">Tiempo promedio por respuesta: {averageResponseTime} s</p>
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
                          {answerItem.isCorrect ? '✓ ' : '✗ '}{answerItem.userAnswer || '(sin respuesta)'}
                        </span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        {answerOptions.map((option) => {
                          const isSelected = normalizar(option) === normalizar(answerItem.userAnswer)
                          const isCorrectOption = normalizar(option) === normalizar(answerItem.correctAnswer)
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

            <div className={`grid gap-3 ${allowReplay ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}>
              {allowReplay && (
                <button type="button" onClick={handleRetry} className="rounded-3xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-700">Reintentar</button>
              )}

              <button type="button" onClick={handleShareOpen} className="rounded-3xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-50">Compartir resultado</button>
            </div>
          </div>

          <ShareModal isOpen={shareOpen} onClose={() => setShareOpen(false)} shareText={shareText} />
        </>
      )
    }

    return (
      <div className="w-full space-y-6 quiz-viewport">
        <div className="text-center max-w-4xl mx-auto">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Pregunta {currentIndex + 1} de {questions.length}</p>
          <h2 className="mt-2 text-xl font-bold text-slate-900 sm:text-3xl">{currentQuestion?.question}</h2>
        </div>

        <div className="relative">
        <div className="flex flex-col gap-2 rounded-[2rem] bg-slate-100 px-4 py-3 timer-box sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-semibold text-slate-700">Tiempo restante</span>
          <span className="rounded-[1.5rem] bg-white px-3 py-2 text-2xl font-bold text-slate-900 shadow-sm">{secondsLeft}</span>
        </div>

        <div className="grid gap-3 md:grid-cols-2 choices-grid">
          {currentQuestion.choices?.map((choice) => {
            const isSelected = normalizar(choice) === normalizar(tempAnswer)

            return (
              <button key={choice} type="button" onClick={() => handleChoice(choice)} disabled={showFeedback} className={`rounded-[1.75rem] border px-4 py-3 text-left text-base font-semibold leading-6 transition ${isSelected ? 'border-sky-600 bg-sky-50 text-slate-900 shadow-sm' : 'border-slate-300 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50'} min-h-[3.6rem] ${showFeedback ? 'cursor-not-allowed opacity-50' : ''}`}>
                {choice}
              </button>
            )
          })}
        </div>

        {showFeedback && (
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900">{normalizar(tempAnswer) === normalizar(currentQuestion.answer) ? '¡Correcto!' : 'Incorrecto'}</p>
                <p className="mt-2 text-sm text-gray-600">Tu respuesta:{' '}<span className={normalizar(tempAnswer) === normalizar(currentQuestion.answer) ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>{tempAnswer || 'Sin respuesta'}</span></p>
                {normalizar(tempAnswer) !== normalizar(currentQuestion.answer) && (<p className="mt-2 text-sm text-gray-600">Respuesta correcta:{' '}<span className="text-green-600 font-semibold">{currentQuestion.answer}</span></p>)}
              </div>

              <button type="button" onClick={handleNext} className="w-full rounded-[1.75rem] bg-slate-900 px-5 py-4 text-base font-semibold text-white transition hover:bg-slate-700">{currentIndex + 1 >= questions.length ? 'Ver resultados' : 'Siguiente pregunta'}</button>
            </div>
          </div>
        )}
        </div>
      </div>
    )
  }

  export default QuizPanel