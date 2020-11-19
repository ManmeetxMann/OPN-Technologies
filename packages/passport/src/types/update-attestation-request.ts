import {EvaluationCriteria, Question} from '../../../lookup/src/models/questionnaire'
import {FieldValue} from '../../../common/src/utils/firebase'

export type UpdateAttestationRequest = {
  questionnaireId: string | FieldValue
  questions?: Record<number, Question>
  answerLogic?: EvaluationCriteria
}
