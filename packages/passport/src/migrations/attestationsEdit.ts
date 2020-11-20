import IMigrationBase from '../../../common/src/interfaces/IMigrationBase.interface'
import {AttestationService} from '../services/attestation-service'
import {QuestionnaireService} from '../../../lookup/src/services/questionnaire-service'
import {FirebaseManager} from '../../../common/src/utils/firebase'

export class AttestationsEdit implements IMigrationBase {
  private attestationService = new AttestationService()
  private questionnaireService = new QuestionnaireService()
  async up(): Promise<void> {
    const attestations = await this.attestationService.getAllAttestations()
    const questionnaires = await this.questionnaireService.getAllQuestionnaire()

    attestations.forEach(async (attestation) => {
      if (attestation.questionnaireId || !attestation.answers) {
        return
      }
      const {id} = questionnaires.find(
        (questionnaire) =>
          Object.keys(attestation.answers).length === Object.keys(questionnaire.questions).length,
      )
      await this.attestationService.update(attestation.id, {
        questionnaireId: id,
      })
    })
  }

  async down(): Promise<void> {
    const attestations = await this.attestationService.getAllAttestations()

    attestations.forEach(async (attestation) => {
      if (!attestation.questionnaireId) {
        return
      }

      await this.attestationService.update(attestation.id, {
        questionnaireId: FirebaseManager.getInstance().getFirestoreDeleteField(),
      })
    })
  }
}
