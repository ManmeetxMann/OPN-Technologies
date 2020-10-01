import DataStore from '../../../common/src/data/datastore'
import {firestore} from 'firebase-admin'
import {serverTimestamp} from '../../../common/src/utils/times'
import {Attestation, AttestationAnswers, AttestationModel} from '../models/attestation'
import {PassportStatus, PassportStatuses} from '../models/passport'
import {DataModelFieldMapOperatorType} from '../../../common/src/data/datamodel.base'
import {TraceModel, TraceRepository} from '../../../access/src/repository/trace.repository'
import {ExposureResult, StatusChangesResult} from '../types/status-changes-result'

export class AttestationService {
  private dataStore = new DataStore()
  private attestationRepository = new AttestationModel(this.dataStore)
  private traceRepository = new TraceRepository(this.dataStore)

  save(attestation: Attestation): Promise<Attestation> {
    return this.attestationRepository
      .add({
        ...attestation,
        attestationTime: serverTimestamp(),
      })
      .then(({attestationTime: time, ...attestation}) => ({
        ...attestation,
        // @ts-ignore
        attestationTime: new firestore.Timestamp(time.seconds, time.nanoseconds)
          .toDate()
          .toISOString(),
      }))
  }

  async latestStatus(userOrDependantId: string): Promise<PassportStatus> {
    const [attestation] = await this.attestationRepository.findWhereArrayContainsWithMax(
      'appliesTo',
      userOrDependantId,
      'attestationTime',
    )
    if (attestation) {
      return attestation.status
    }
    return 'pending'
  }

  async getStatusChangesInPeriod(
    organizationId: string,
    userId: string,
    from: string,
    to: string,
  ): Promise<StatusChangesResult> {
    const attestations = await this.attestationRepository.findWhereMapHasKeyValueEqual([
      {
        map: '/',
        key: 'organizationId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: organizationId,
      },
      {
        map: '/',
        key: 'userId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: userId,
      },
      {
        map: '/',
        key: 'attestationTime',
        operator: DataModelFieldMapOperatorType.GreatOrEqual,
        value: from,
      },
      {
        map: '/',
        key: 'attestationTime',
        operator: DataModelFieldMapOperatorType.LessOrEqual,
        value: to,
      },
    ])

    const attestationStatuses: PassportStatus[] = attestations.map((attestation: Attestation) => attestation.status)
    const attestationAnswersForFailure: AttestationAnswers[] = attestations
      .filter((attestation: Attestation) => attestation.status === PassportStatuses.Caution || attestation.status === PassportStatuses.Stop)
      .map((attestation: Attestation) => attestation.answers)

    const allTracesForUserInPeriod = await this.traceRepository
      .collection()
      .where('userId', '==', userId)
      .where('date', '>=', from)
      .where('date', '<=', to)
      .fetch()

    const riskyTraces = allTracesForUserInPeriod
      .filter((trace: TraceModel) => trace.passportStatus === PassportStatuses.Stop || trace.passportStatus === PassportStatuses.Caution)

    const exposures: ExposureResult[] = riskyTraces.map((trace: TraceModel) => {
      return {
        userId: userId,
        date: trace.date,
        duration: trace.duration,
        exposures: trace.exposures,
      } as ExposureResult
    })

    return {
      statusChanges: attestationStatuses,
      answersForFailure: attestationAnswersForFailure,
      exposures: exposures,
    }
  }
}
