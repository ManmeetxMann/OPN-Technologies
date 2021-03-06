import DataModel from '../../../common/src/data/datamodel.base'
import {EvaluationCriteria, Questionnaire} from '../models/questionnaire'

export class QuestionnaireModel extends DataModel<Questionnaire> {
  public readonly rootPath = 'questionnaires'
  readonly zeroSet = []
  readonly evaluationCriterias = {
    4: {values: [1, 1, 1, 2], caution: 1, stop: 2},
    6: {values: [1, 1, 1, 1, 1, 1], caution: 100, stop: 1},
    13: {values: [2, 2, 2, 2, 1, 1, 1, 1, 1, 2, 2, 2, 100], caution: 1, stop: 100},
  }

  getEvaluationCriteria(questionCount: number): Promise<EvaluationCriteria> {
    return this.evaluationCriterias[questionCount]
  }
}
