import DataStore from '../../../common/src/data/datastore'
import {QuestionnaireModel} from '../repository/questionnaire.repository'
import {Questionnaire} from '../models/questionnaire'

export class QuestionnaireService {
  private dataStore = new DataStore()
  private questionnaireRepository = new QuestionnaireModel(this.dataStore)

  create(questionnaire: Questionnaire): Promise<Questionnaire> {
    return this.questionnaireRepository.add(questionnaire)
  }

  getQuestionnaire(questionnaireId: string): Promise<Questionnaire> {
    return this.questionnaireRepository.get(questionnaireId)
  }
}
