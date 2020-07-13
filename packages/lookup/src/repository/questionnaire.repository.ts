import DataModel from '../../../common/src/data/datamodel.base'
import {Questionnaire} from '../models/questionnaire'

export class QuestionnaireModel extends DataModel<Questionnaire> {
  public readonly rootPath = 'questionnaires'
  readonly zeroSet = []
}
