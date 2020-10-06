import DataStore from '../../../common/src/data/datastore'
import {QuestionnaireModel} from '../repository/questionnaire.repository'
import {EvaluationCriteria, Questionnaire} from '../models/questionnaire'

export class QuestionnaireService {
  private dataStore = new DataStore()
  private questionnaireRepository = new QuestionnaireModel(this.dataStore)

  create(questionnaire: Questionnaire): Promise<Questionnaire> {
    return this.questionnaireRepository.add(questionnaire)
  }

  getQuestionnaire(questionnaireId: string): Promise<Questionnaire> {
    return this.questionnaireRepository.get(questionnaireId)
  }

  async updateProperty(
    questionnaireId: string,
    fieldName: string,
    fieldValue: unknown,
  ): Promise<void> {
    await this.questionnaireRepository.updateProperty(questionnaireId, fieldName, fieldValue)
  }

  async getAnswerLogic(
    questionnaireId: string,
    questionCount: number,
  ): Promise<EvaluationCriteria> {
    const answerLogic = this.questionnaireRepository.getFireStore(questionCount)

    await this.updateProperty(questionnaireId, 'answerLogic', answerLogic)

    const questionnaire: Questionnaire = await this.questionnaireRepository.get(questionnaireId)

    return questionnaire.answerLogic
  }
}
