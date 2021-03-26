import {Attestation} from '../../models/attestation'
import {PassportStatus} from '../../models/passport'

export class AttestationService {
  async lastAttestationByUserId(userId: string, organizationId: string): Promise<Attestation> {
    const status: PassportStatus = 'proceed'
    const answers = [
      {
        questionId: 1,
        answer: true,
        additionalValue: 'TestAdditionalValue',
      },
    ]

    return {
      id: 'TestID',
      answers,
      userId,
      appliesTo: ['TEST'],
      locationId: 'TestLocation',
      organizationId,
      questionnaireId: 'TestQuestionId',
      attestationTime: new Date().toString(),
      status,
    }
  }
}
