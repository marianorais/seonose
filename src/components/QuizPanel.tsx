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
import { getCategoryMeta } from '../lib/categoryHelpers'

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
  dayKey?: string
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
    const savedState = typeof window !== 'undefined' ? cargarEstadoGuardado<SavedQuizState>(questionDate) : null

    const gameNumber = useMemo(() => obtenerNumeroPartida(), [])

    const [currentIndex, setCurrentIndex] = useState<number>(savedState?.currentIndex ?? 0)
    const [secondsLeft, setSecondsLeft] = useState<number>(savedState?.secondsLeft ?? settings?.secondsPerQuestion ?? 30)
    const [answers, setAnswers] = useState<Answer[]>(savedState?.answers ?? [])
    const [finished, setFinished] = useState<boolean>(savedState?.finished ?? false)
    const [nextIteration, setNextIteration] = useState<Date>(savedState?.nextIteration ? new Date(savedState.nextIteration) : obtenerSiguienteIteracion())
    const [remainingText, setRemainingText] = useState<string>(formatearTiempoRestante(nextIteration))

    const [shareOpen, setShareOpen] = useState<boolean>(false)
    const [shareText, setShareText] = useState<string>('')
    const [copiedToast, setCopiedToast] = useState<boolean>(false)

    const [questionStartTime, setQuestionStartTime] = useState<number>(() => Date.now())
    const [showFeedback, setShowFeedback] = useState<boolean>(savedState?.showFeedback ?? false)
    const [tempAnswer, setTempAnswer] = useState<string>(savedState?.answer ?? '')
    const [isTimeout, setIsTimeout] = useState<boolean>(savedState?.isTimeout ?? false)

    const finishRecordedRef = useRef<boolean>(savedState?.finished ?? false)
    const previousQuestionDateRef = useRef<string | null>(null)
    // Evita que un doble click (o una reentrada durante el guardado async)
    // agregue dos respuestas para la misma pregunta.
    const advancingRef = useRef<boolean>(false)
    // Último estado con progreso, para persistirlo al ocultar/descargar la página.
    const latestSnapshotRef = useRef<SavedQuizState | null>(null)

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
      advancingRef.current = false
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

    // Libera el lock al pasar a una nueva pregunta.
    useEffect(() => {
      advancingRef.current = false
    }, [currentIndex])

    useEffect(() => {
      const snapshot: SavedQuizState = {
        currentIndex,
        secondsLeft,
        answer: tempAnswer,
        answers,
        finished,
        nextIteration: nextIteration.toISOString(),
        gameNumber,
        dayKey: questionDate,
        showFeedback,
        isTimeout,
      }

      // Estado "pristino": partida recién iniciada o reseteada, sin nada que
      // preservar. No lo persistimos para no pisar un estado con progreso ya
      // guardado (causa del reinicio ocasional al refrescar).
      const sinProgreso =
        !finished &&
        !showFeedback &&
        !isTimeout &&
        currentIndex === 0 &&
        answers.length === 0 &&
        tempAnswer === ''

      if (sinProgreso) {
        latestSnapshotRef.current = null
        return
      }

      latestSnapshotRef.current = snapshot
      guardarEstadoQuiz(snapshot)
    }, [currentIndex, secondsLeft, answers, finished, nextIteration, gameNumber, questionDate, showFeedback, tempAnswer, isTimeout])

    // Persiste el último estado con progreso justo antes de que la página se
    // oculte o se descargue (refresh, cierre, cambio de pestaña), cerrando la
    // ventana en la que un cambio reciente podría no haberse guardado.
    useEffect(() => {
      const flush = () => {
        if (latestSnapshotRef.current) {
          guardarEstadoQuiz(latestSnapshotRef.current)
        }
      }

      const onVisibilityChange = () => {
        if (document.visibilityState === 'hidden') flush()
      }

      window.addEventListener('pagehide', flush)
      document.addEventListener('visibilitychange', onVisibilityChange)

      return () => {
        window.removeEventListener('pagehide', flush)
        document.removeEventListener('visibilitychange', onVisibilityChange)
      }
    }, [])

    const handleNext = async () => {
      if (!currentQuestion || !showFeedback) return
      if (advancingRef.current) return
      advancingRef.current = true

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
        // Registrar la partida una sola vez, aunque se re-entre a este bloque
        // (doble click o refresh durante el guardado async). Evita sesiones y
        // respuestas duplicadas en la base.
        if (!finishRecordedRef.current) {
          finishRecordedRef.current = true
          guardarResultadoEnHistorial(nextAnswers)
          await saveCompletedGame(nextAnswers)
        }
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

    // Texto que se comparte: incluye una barra de cuadraditos (🟩 acierto /
    // 🟥 error) en el orden real en que se respondieron las preguntas.
    const construirTextoResultado = () => {
      const correctCount = answers.filter((a) => a.isCorrect).length
      const total = answers.length
      const barra = answers.map((a) => (a.isCorrect ? '🟩' : '🟥')).join('')

      return [
        `🧠 Se o NoSe #${gameNumber} ${correctCount}/${total}`,
        barra,
        `👉 ${window.location.origin}`,
      ].join('\n')
    }

    const handleShareOpen = () => {
      setShareText(construirTextoResultado())
      setShareOpen(true)
    }

    const renderCategoryBadge = (question: QuestionItem | undefined) => {
      if (!question) return null

      const categoryMeta = getCategoryMeta(question.categoryId, question.categoryName, question.categoryIcon)

      return (
        <span
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-transparent text-base shadow-none"
          title={categoryMeta.name}
          aria-label={categoryMeta.name}
        >
          <span aria-hidden="true">{categoryMeta.icon}</span>
        </span>
      )
    }

    if (!settings || questions.length === 0) {
      return <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-600">Cargando preguntas...</div>
    }

    if (finished) {
      const correctCount = answers.filter((a) => a.isCorrect).length
      const totalResponseTime = answers.reduce((sum, a) => sum + a.responseTime, 0)
      const averageResponseTime = answers.length > 0 ? Math.round(totalResponseTime / answers.length) : 0
      const shareSummary = construirTextoResultado()

      const copyToClipboard = async (text: string) => {
        try {
          await navigator.clipboard.writeText(text)
          setCopiedToast(true)
          window.setTimeout(() => setCopiedToast(false), 2000)
        } catch (e) {
          console.error('No se pudo copiar', e)
        }
      }

      const shareViaWhatsApp = (text: string) => {
        const encoded = encodeURIComponent(text)
        const href = `https://wa.me/?text=${encoded}`
        window.open(href, '_blank')
      }

      return (
        <>
          <div className="w-full space-y-8">
            <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-gray-500">Resultados</p>
                  <h2 className="mt-3 text-3xl font-bold text-gray-900">{correctCount} de {answers.length} correctas</h2>
                  <p className="mt-2 text-lg tracking-wide" aria-label={`${correctCount} de ${answers.length} correctas`}>
                    {answers.map((a, index) => (
                      <span key={index}>{a.isCorrect ? '🟩' : '🟥'}</span>
                    ))}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">Tiempo promedio por respuesta: {averageResponseTime} s</p>
                </div>

                <div className="mt-2 flex flex-nowrap items-center gap-2">
                  <button
                    id="btnTresPuntos"
                    type="button"
                    aria-label="Compartir resultado"
                    onClick={() => {
                      setShareText(shareSummary)
                      setShareOpen(true)
                    }}
                    className="inline-flex h-10 items-center justify-center rounded-full bg-[#25D366] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1fb15b]"
                    title="Compartir resultado"
                  >
                    Compartir
                  </button>

                  <button type="button" aria-label="Compartir por WhatsApp" onClick={() => shareViaWhatsApp(shareSummary)} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm" title="Compartir por WhatsApp">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.867-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413z"/>
                    </svg>
                  </button>

                  <button type="button" aria-label="Copiar resultado" onClick={() => copyToClipboard(shareSummary)} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900 shadow-sm" title="Copiar resultado">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <path d="M16 1H4a2 2 0 00-2 2v12h2V3h12V1z" fill="#111827"/>
                      <path d="M20 5H8a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2zm0 16H8V7h12v14z" fill="#111827"/>
                    </svg>
                  </button>
                </div>
              </div>

                <div className="flex min-w-[180px] flex-col justify-center rounded-3xl bg-gray-900 px-5 py-4 text-right text-white sm:text-left">
                  <p className="text-xs uppercase tracking-widest text-slate-300">Próxima reiteración</p>
                  <p className="mt-2 text-4xl font-bold">{remainingText}</p>
                </div>
            </div>

              {/* Prominent share actions: WhatsApp, copy, native share */}
              <div className="space-y-4">
              {answers.map((answerItem, index) => {
                const answerOptions = getResultOptions(answerItem)

                return (
                  <div key={index} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-semibold text-gray-600">Pregunta {index + 1}</p>
                    <div className="mt-2 flex items-start gap-3">
                      {(() => {
                        const question = questions.find((item) => item.id === answerItem.questionId)
                        return renderCategoryBadge(question)
                      })()}
                      <p className="text-base leading-7 text-gray-900">{answerItem.question}</p>
                    </div>

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

          {copiedToast && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-full bg-slate-900 px-4 py-2 text-sm text-white shadow">Texto copiado</div>
          )}
        </>
      )
    }

    return (
      <div className="w-full space-y-6 quiz-viewport">
        <div className="mx-auto w-full max-w-4xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Pregunta {currentIndex + 1} de {questions.length}</p>
          <div className="mt-3 flex items-start justify-center gap-3">
            {renderCategoryBadge(currentQuestion)}
            <h2 className="text-xl font-bold leading-tight text-slate-900 sm:text-3xl">{currentQuestion?.question}</h2>
          </div>
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