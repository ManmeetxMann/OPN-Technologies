import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {Questionnaire} from '../models/questionnaire'

export class QuestionnaireModel extends DataModel<Questionnaire> {
  public readonly rootPath = 'questionnaires'
  readonly zeroSet = []
  constructor(ds: DataStore) {
    super(ds)
  }
}
