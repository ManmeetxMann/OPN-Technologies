import {firestore} from 'firebase-admin'
import DataStore from '../../../common/src/data/datastore'
import {OPNPubSub} from '../../../common/src/service/google/pub_sub'
import {
  DataModelFieldMapOperatorType,
  DataModelFieldMap,
} from '../../../common/src/data/datamodel.base'
import {Config} from '../../../common/src/utils/config'
import {serverTimestamp} from '../../../common/src/utils/times'
import {Attestation, AttestationModel} from '../models/attestation'
import {PassportStatus, PassportStatuses} from '../models/passport'
import {ExposureResult} from '../types/status-changes-result'

import {TraceModel, TraceRepository} from '../../../access/src/repository/trace.repository'

import moment from 'moment'

const timeZone = Config.get('DEFAULT_TIME_ZONE')

export class AttestationService {
  private dataStore = new DataStore()
  private attestationRepository = new AttestationModel(this.dataStore)
  private traceRepository = new TraceRepository(this.dataStore)
  private pubsub = new OPNPubSub(Config.get('ATTESTATION_TOPIC'))

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
      .then((att) => {
        att.appliesTo.forEach((userId) => {
          this.pubsub.publish(
            {
              id: att.id,
              status: att.status,
            },
            {
              userId: userId,
              organizationId: att.organizationId,
              actionType: 'created',
            },
          )
        })
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

  async getTracesInPeriod(
    userId: string,
    from: string,
    to: string,
    dependantId: string | null,
  ): Promise<ExposureResult[]> {
    const query = this.traceRepository.collection().where('userId', '==', userId)

    if (from) {
      query.where('date', '>=', moment(from).tz(timeZone).format('YYYY-MM-DD'))
    }

    if (to) {
      query.where('date', '<=', moment(to).tz(timeZone).format('YYYY-MM-DD'))
    }

    const allTracesForUserInPeriod = await query.fetch()

    const riskyTraces = allTracesForUserInPeriod.filter((trace) => {
      // NOTE: some of these checks could theoretically be done in the firestore query
      // but it would require many more indices than we want to create
      if (![PassportStatuses.Stop, PassportStatuses.Caution].includes(trace.passportStatus)) {
        return false
      }
      if (dependantId) {
        if (!trace.dependantIds) {
          console.warn(`trace ${trace.id} has no dependantIds array`)
          return true
        }
        return trace.dependantIds.includes(dependantId)
      }
      if (typeof trace.includesGuardian === 'boolean') {
        return trace.includesGuardian
      }
      // old records do not have an includesGuardian field, we need to guess
      if (!trace.dependantIds?.length) {
        // no dependants, must be the guardian
        return true
      }
      if (trace.exposedIds.includes(userId)) {
        // can't be this user if they were exposed
        return false
      }
      console.warn(
        `Trace ${trace.id} is ambiguous (it may or may not originate from user ${userId})`,
      )
      return true
    })

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
      .where('userId', '==', userOrDependantId)
      .where('organizationId', '==', organizationId)
      .orderBy('attestationTime', 'desc')
      .fetch()

    return attestation
  }

  getAllAttestationByUserId(userId: string): Promise<Attestation[]> {
    return this.attestationRepository.findWhereEqual('userId', userId)
  }
}
