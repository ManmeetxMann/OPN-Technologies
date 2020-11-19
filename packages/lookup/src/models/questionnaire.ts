export type Questionnaire = {
  id: string
  questions: Record<number, Question>
  answerLogic: EvaluationCriteria
}

export type EvaluationCriteria = {
  values: number[]
  caution: number
  stop: number
}

export type Question = {
  value: string
  answers: Record<number, AnswerType>
}

type AnswerType = 'boolean' | 'datetime'
