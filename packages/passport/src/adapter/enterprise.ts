import {Config} from '../../../common/src/utils/config'
import fetch from 'node-fetch'
import {LogInfo, LogWarning} from '../../../common/src/utils/logging-setup'
import {Attestation} from '../models/attestation'
import {Passport} from '../models/passport'
import {safeTimestamp} from '../../../common/src/utils/datetime-util'

const APIURL = Config.get('DOMAIN_ENTERPRISE')

export class Enterprise {
  async postAttestation(attestation: Partial<Attestation>): Promise<void> {
    const apiUrl = `${APIURL}enterprise/api/v1/internal/attestation`
    const body = JSON.stringify({
      id: attestation.id,
      status: attestation.status,
      userId: attestation.userId,
      organizationId: attestation.organizationId,
    })
    LogInfo(`EnterpriseAdapter`, 'postAttestation', {
      id: attestation.id,
      status: attestation.status,
      userId: attestation.userId,
    })
    const res = await fetch(apiUrl, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body,
    })

    if (!res.ok) {
      LogWarning('EnterpriseAdapter', 'postAttestation', {errorMessage: res.statusText})
    }
  }

  async postPassport(passport: Partial<Passport>): Promise<void> {
    const apiUrl = `${APIURL}enterprise/api/v1/internal/passport`
    const body = JSON.stringify({
      id: passport.id,
      status: passport.status,
      expiry: safeTimestamp(passport.validUntil).toISOString(),
      userId: passport.userId,
      organizationId: passport.organizationId,
    })
    LogInfo(`EnterpriseAdapter`, 'postPassport', {
      id: passport.id,
      status: passport.status,
    })
    const res = await fetch(apiUrl, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body,
    })

    if (!res.ok) {
      LogWarning('EnterpriseAdapter', 'postPassport', {errorMessage: res.statusText})
    }
  }
}
