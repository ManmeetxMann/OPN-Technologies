import {firestore} from 'firebase-admin'
import DataStore from '../../../common/src/data/datastore'
// import {OPNPubSub} from '../../../common/src/service/google/pub_sub'
import {
  DataModelFieldMapOperatorType,
  DataModelFieldMap,
} from '../../../common/src/data/datamodel.base'
import {Config} from '../../../common/src/utils/config'
import {serverTimestamp} from '../../../common/src/utils/times'
import PassportAdapter from '../../../common/src/adapters/passport'

import {Attestation, AttestationModel} from '../models/attestation'
import {PassportStatus, PassportStatuses} from '../models/passport'
import {ExposureResult} from '../types/status-changes-result'

import {TraceModel, TraceRepository} from '../../../access/src/repository/trace.repository'
import {OrganizationService} from '../../../enterprise/src/services/organization-service'

import moment from 'moment'
import {Enterprise} from '../adapter/enterprise'

const timeZone = Config.get('DEFAULT_TIME_ZONE')

export class AttestationService {
  private dataStore = new DataStore()
  private attestationRepository = new AttestationModel(this.dataStore)
  private traceRepository = new TraceRepository(this.dataStore)
  // private pubsub = new OPNPubSub(Config.get('ATTESTATION_TOPIC'))
  private adapter = new PassportAdapter()
  private orgService = new OrganizationService()
  private enterprise = new Enterprise()

  private statusFor(status: PassportStatuses, tempRequired: boolean): PassportStatuses {
    if (status === PassportStatuses.Proceed && tempRequired) {
      return PassportStatuses.TemperatureCheckRequired
    }
    return status
  }

  async postPubsub(att: Attestation): Promise<void> {
    await this.enterprise.postAttestation(att)
    // this.pubsub.publish(
    //   {
    //     id: att.id,
    //     status: att.status,
    //   },
    //   {
    //     userId: userId,
    //     organizationId: att.organizationId,
    //     actionType: 'created',
    //   },
    // )
  }

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
      .then(async (att) => {
        const org = await this.orgService.findOneById(att.organizationId)
        await Promise.all(
          att.appliesTo.map(async (userId) => {
            await this.postPubsub(att)
            const passportStatus = this.statusFor(
              att.status as PassportStatuses,
              org.enableTemperatureCheck,
            )
            return this.adapter.createPassport(userId, att.organizationId, passportStatus, att.id)
          }),
        )
        return att
      })
  }

  async latestStatus(userOrDependantId: string, organizationId: string): Promise<PassportStatus> {
    const [attestation] = await this.attestationRepository
      .getQueryFindWhereArrayContains('appliesTo', userOrDependantId)
      .where('organizationId', '==', organizationId)
      .orderBy('attestationTime', 'desc')
      .fetch()
    return attestation?.status ?? 'pending'
  }

  async statusByLocationAndUserId(
    locationId: string,
    userOrDependantId: string,
  ): Promise<Attestation> {
    const [attestation] = await this.attestationRepository
      .getQueryFindWhereArrayInMapContains('appliesTo', userOrDependantId, 'attestationTime')
      .where('locationId', '==', locationId)
      .orderBy('attestationTime', 'desc')
      .limit(1)
      .fetch()

    return attestation
  }

  async getTracesInPeriod(userId: string, from: string, to: string): Promise<ExposureResult[]> {
    const query = this.traceRepository.collection().where('userId', '==', userId)
    if (from) {
      query.where('date', '>=', moment(from).tz(timeZone).format('YYYY-MM-DD'))
    }

    if (to) {
      query.where('date', '<=', moment(to).tz(timeZone).format('YYYY-MM-DD'))
    }
    const allTracesForUserInPeriod = await query.fetch()

    const exposures: ExposureResult[] = allTracesForUserInPeriod.map((trace: TraceModel) => {
      return {
        userId: userId,
        date: trace.date,
        duration: trace.duration,
        exposures: trace.exposures,
      } as ExposureResult
    })
    return exposures
  }

  async getExposuresInPeriod(
    userOrDependantId: string,
    from: string,
    to: string,
  ): Promise<TraceModel[]> {
    const conditions = [
      {
        map: '/',
        key: 'exposedIds',
        operator: DataModelFieldMapOperatorType.ArrayContains,
        value: userOrDependantId,
      },
    ]
    if (from) {
      conditions.push({
        map: '/',
        key: 'date',
        operator: DataModelFieldMapOperatorType.GreatOrEqual,
        value: from,
      })
    }
    if (to) {
      conditions.push({
        map: '/',
        key: 'date',
        operator: DataModelFieldMapOperatorType.LessOrEqual,
        value: to,
      })
    }
    return this.traceRepository.findWhereEqualInMap(conditions)
  }

  async getAttestationsInPeriod(userId: string, from: string, to: string): Promise<Attestation[]> {
    const selector: DataModelFieldMap[] = [
      {
        map: '/',
        key: 'appliesTo',
        operator: DataModelFieldMapOperatorType.ArrayContains,
        value: userId,
      },
    ]

    if (from) {
      selector.push({
        map: '/',
        key: 'attestationTime',
        operator: DataModelFieldMapOperatorType.GreatOrEqual,
        value: new Date(from),
      })
    }

    if (to) {
      selector.push({
        map: '/',
        key: 'attestationTime',
        operator: DataModelFieldMapOperatorType.LessOrEqual,
        value: new Date(to),
      })
    }

    // order descernding and reverse so that we don't need to create an extra index
    const attestations = await this.attestationRepository.findWhereEqualInMap(selector, {
      key: 'attestationTime',
      direction: 'desc',
    })
    attestations.reverse()
    return attestations
  }

  async lastAttestationByUserId(
    userOrDependantId: string,
    organizationId: string,
  ): Promise<Attestation> {
    const [attestation] = await this.attestationRepository
      .getQueryFindWhereArrayContains('appliesTo', userOrDependantId)
      .where('organizationId', '==', organizationId)
      .orderBy('attestationTime', 'desc')
      .fetch()

    return attestation
  }

  getAllAttestationByUserId(userId: string, organizationId: string): Promise<Attestation[]> {
    return this.attestationRepository
      .getQueryFindWhereEqual('organizationId', organizationId)
      .where('userId', '==', userId)
      .fetch()
  }

  async getByAttestationId(attestationId: string): Promise<Attestation> {
    const [attestation] = await this.attestationRepository
      .collection()
      .where(firestore.FieldPath.documentId(), '==', attestationId)
      .fetch()

    return attestation
  }
}
