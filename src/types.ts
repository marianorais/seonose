export interface QuestionItem {
  id: number
  question: string
  answer: string
  choices?: string[]
  availablefrom?: string
  enabled?: boolean
  repeatable?: boolean
  categoryId?: number | null
  categoryName?: string | null
  categoryIcon?: string | null
}

export interface QuestionSettings {
  questionsPerDay: number
  secondsPerQuestion: number
}

export interface GameSettings {
  id: number
  questionspergame: number
  secondsperquestion: number
  backgroundcolor: string
  fontfamily: string
}