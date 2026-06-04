/**
 * Utilidades usadas por `App.tsx` para selección de preguntas,
 * formatos de fecha y operaciones determinísticas (shuffle con seed).
 * Estas funciones se exportan sin cambiar su comportamiento.
 */

import type { QuestionItem, QuestionSettings } from '../types'

export const SETTINGS_STORAGE_KEY_QUESTIONS = 'seonose-custom-settings-questions'

export const normalizeString = (value?: string) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

export const ensureThreeChoices = (question: QuestionItem) => {
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

export const getTodayKey = () => {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
}

export const loadCustomSettings = (): QuestionSettings => {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY_QUESTIONS)

    if (!raw) {
      return { questionsPerDay: 5, secondsPerQuestion: 30 }
    }

    const parsed = JSON.parse(raw) as Partial<QuestionSettings>

    return {
      questionsPerDay: Number(parsed.questionsPerDay) || 5,
      secondsPerQuestion: Number(parsed.secondsPerQuestion) || 30,
    }
  } catch {
    return { questionsPerDay: 5, secondsPerQuestion: 30 }
  }
}

export const createSeedFromString = (value: string) => {
  let hash = 0

  for (let i = 0; i < value.length; i += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(i)
  }

  return hash
}

export const shuffleWithSeed = <T,>(items: T[], seedSource: string) => {
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

export const selectDailyQuestions = (questions: QuestionItem[], dateKey: string, count: number) => {
  const dailyQuestions = questions.filter(
    (question) =>
      question.enabled &&
      (!question.availablefrom || question.availablefrom.slice(0, 10) === dateKey)
  )

  const repeatableQuestions = questions.filter(
    (question) =>
      question.enabled &&
      question.repeatable &&
      !dailyQuestions.some((daily) => daily.id === question.id)
  )

  const selectedDaily = shuffleWithSeed(dailyQuestions, dateKey).slice(0, count)

  if (selectedDaily.length >= count) {
    return selectedDaily.map(ensureThreeChoices)
  }

  const missingCount = count - selectedDaily.length
  const selectedExtra = shuffleWithSeed(repeatableQuestions, `${dateKey}-repeatable`).slice(0, missingCount)

  return [...selectedDaily, ...selectedExtra].slice(0, count).map(ensureThreeChoices)
}
