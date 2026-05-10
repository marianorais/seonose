export interface QuestionItem {
  id: number
  question: string
  answer: string
  choices?: string[]
}

export interface QuestionSettings {
  questionsPerDay: number
  secondsPerQuestion: number
}
