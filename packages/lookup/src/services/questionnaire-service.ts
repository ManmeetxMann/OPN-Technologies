import DataStore from '../../../common/src/data/datastore'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'

import {QuestionnaireModel} from '../repository/questionnaire.repository'
import {EvaluationCriteria, Questionnaire} from '../models/questionnaire'

import {PassportStatuses} from '../../../passport/src/models/passport'
import {AttestationAnswersV1} from '../../../passport/src/models/attestation'

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

  async evaluateAnswers(
    questionnaireId: string,
    answers: AttestationAnswersV1,
  ): Promise<PassportStatuses> {
    const {values, caution, stop}: EvaluationCriteria = await this.getAnswerLogic(questionnaireId)

    const score = values
      .map((value: number, index: number) => (answers[index][0] ? value : 0))
      .reduce((total, current) => total + current)

    if (score >= stop) {
      return PassportStatuses.Stop
    }

    if (score >= caution) {
      return PassportStatuses.Caution
    }

    return PassportStatuses.Proceed
  }

  async getAllQuestionnaires(): Promise<Questionnaire[]> {
    return this.questionnaireRepository.fetchAll()
  }
}
