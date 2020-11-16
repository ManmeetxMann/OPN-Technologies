import DataStore from '../../../common/src/data/datastore'
import {QuestionnaireModel} from '../repository/questionnaire.repository'
import {EvaluationCriteria, Questionnaire} from '../models/questionnaire'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'

export class QuestionnaireService {
  private dataStore = new DataStore()
  private questionnaireRepository = new QuestionnaireModel(this.dataStore)

  create(questionnaire: Questionnaire): Promise<Questionnaire> {
    return this.questionnaireRepository.add(questionnaire)
  }

  getQuestionnaire(questionnaireId: string): Promise<Questionnaire> {
    return this.questionnaireRepository.get(questionnaireId)
  }

  getQuestionnaires(questionnaireIds: string[]): Promise<Questionnaire[]> {
    return this.questionnaireRepository.findWhereIdIn(questionnaireIds)
  }

  async updateProperty(
    questionnaireId: string,
    fieldName: string,
    fieldValue: unknown,
  ): Promise<void> {
    await this.questionnaireRepository.updateProperty(questionnaireId, fieldName, fieldValue)
  }

  async getAnswerLogic(questionnaireId: string): Promise<EvaluationCriteria> {
    const questionnaire: Questionnaire = await this.questionnaireRepository.get(questionnaireId)

    if (!questionnaire) {
      throw new ResourceNotFoundException(`Cannot find questionnaire with ID [${questionnaireId}]`)
    }

    let answerLogic = questionnaire.answerLogic

    if (!answerLogic) {
      const questionCount = Object.keys(questionnaire.questions).length

      answerLogic = await this.questionnaireRepository.getEvaluationCriteria(questionCount)

      await this.updateProperty(questionnaireId, 'answerLogic', answerLogic)
    }

    return answerLogic
  }
}
