export interface QuestionItem {
  id: number
  question: string
  answer: string
  choices?: string[]
  availablefrom?: string
  enabled?: boolean

}

export interface QuestionSettings {
  questionsPerDay: number
  secondsPerQuestion: number
}
