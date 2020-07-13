export type Questionnaire = {
  id: string
  questions: Record<number, Question>
}

type Question = {
  value: string
  answers: Record<number, AnswerType>
}

type AnswerType = 'boolean' | 'datetime'
