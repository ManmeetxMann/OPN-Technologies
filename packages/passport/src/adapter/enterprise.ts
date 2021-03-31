import {Config} from '../../../common/src/utils/config'
import fetch from 'node-fetch'
import {LogInfo, LogWarning} from '../../../common/src/utils/logging-setup'
import {Attestation} from '../models/attestation'

const APIURL = Config.get('DOMAIN_ENTERPRISE')

export class Enterprise {
  async pubsubAttestation(attestation: Partial<Attestation>): Promise<void> {
    const apiUrl = `${APIURL}enterprise/api/v3/pubsub/attestation`
    const body = JSON.stringify({
      id: attestation.id,
      status: attestation.status,
      userId: attestation.userId,
      organizationId: attestation.organizationId,
    })
    LogInfo(`EnterpriseAdapter`, 'pubsubAttestation', {
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
      LogWarning('EnterpriseAdapter', 'pubsubAttestation', {errorMessage: res.statusText})
    }
  }
}
