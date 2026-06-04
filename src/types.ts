export interface QuestionItem {
  id: number
  question: string
  answer: string
  choices?: string[]
  availablefrom?: string
  enabled?: boolean
  repeatable?: boolean
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