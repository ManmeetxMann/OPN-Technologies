import DataStore from '../../../common/src/data/datastore'
import {firestore} from 'firebase-admin'
import {serverTimestamp} from '../../../common/src/utils/times'
import {Attestation, AttestationModel} from '../models/attestation'
import {PassportStatus, PassportStatuses} from '../models/passport'
import {DataModelFieldMapOperatorType} from '../../../common/src/data/datamodel.base'
import {TraceModel, TraceRepository} from '../../../access/src/repository/trace.repository'
import {ExposureResult} from '../types/status-changes-result'

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

  async getExposuresInPeriod(userId: string, from: string, to: string): Promise<ExposureResult[]> {
    const query = this.traceRepository.collection().where('userId', '==', userId)

    if (from) {
      query.where('date', '>=', from)
    }

    if (to) {
      query.where('date', '<=', to)
    }

    const allTracesForUserInPeriod = await query.fetch()

    const riskyTraces = allTracesForUserInPeriod.filter(
      (trace: TraceModel) =>
        trace.passportStatus === PassportStatuses.Stop ||
        trace.passportStatus === PassportStatuses.Caution,
    )

    const exposures: ExposureResult[] = riskyTraces.map((trace: TraceModel) => {
      return {
        userId: userId,
        date: trace.date,
        duration: trace.duration,
        exposures: trace.exposures,
      } as ExposureResult
    })
    return exposures
  }

  async getAttestationsInPeriod(
    organizationId: string,
    userId: string,
    from: string,
    to: string,
  ): Promise<Attestation[]> {
    const selector = [
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
    ]

    if (from) {
      selector.push({
        map: '/',
        key: 'attestationTime',
        operator: DataModelFieldMapOperatorType.GreatOrEqual,
        value: from,
      })
    }

    if (to) {
      selector.push({
        map: '/',
        key: 'attestationTime',
        operator: DataModelFieldMapOperatorType.LessOrEqual,
        value: to,
      })
    }

    const attestations = await this.attestationRepository.findWhereEqualInMap(selector)

    return attestations
  }
}
