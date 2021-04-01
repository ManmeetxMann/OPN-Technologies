import {Config} from '../../../common/src/utils/config'
import fetch from 'node-fetch'
import {LocalUser} from '../../../common/src/data/user'
import {PulseOxygenDBModel} from '../models/pulse-oxygen'
import {LogInfo, LogWarning} from '../../../common/src/utils/logging-setup'
import {TemperatureDBModel} from '../models/temperature'

const APIURL = Config.get('DOMAIN_ENTERPRISE')

export class Enterprise {
  async findOrCreateUser(userData: {
    email: string
    firstName: string
    lastName: string
    organizationId: string
    address: string
    dateOfBirth: string
    agreeToConductFHHealthAssessment: boolean
    shareTestResultWithEmployer: boolean
    readTermsAndConditions: boolean
    receiveResultsViaEmail: boolean
    receiveNotificationsFromGov: boolean
  }): Promise<{data: LocalUser}> {
    const apiUrl = `${APIURL}enterprise/internal/api/v1/user`
    const body = JSON.stringify({
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      organizationId: userData.organizationId,
      address: userData.address,
      dateOfBirth: userData.dateOfBirth,
      agreeToConductFHHealthAssessment: userData.agreeToConductFHHealthAssessment,
      shareTestResultWithEmployer: userData.shareTestResultWithEmployer,
      readTermsAndConditions: userData.readTermsAndConditions,
      receiveResultsViaEmail: userData.receiveResultsViaEmail,
      receiveNotificationsFromGov: userData.receiveNotificationsFromGov,
    })
    const res = await fetch(apiUrl, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body,
    })
    return res.json()
  }

  async postPulse(pulseResult: Partial<PulseOxygenDBModel>): Promise<void> {
    const apiUrl = `${APIURL}enterprise/api/v1/internal/pulse`
    const body = JSON.stringify({
      userId: pulseResult.userId,
      organizationId: pulseResult.organizationId,
      pulseId: pulseResult.id,
      pulse: pulseResult.pulse,
      oxygen: pulseResult.oxygen,
      status: pulseResult.status,
    })
    LogInfo(`EnterpriseAdapter`, 'postPulse', {
      id: pulseResult.id,
      organizationId: pulseResult.organizationId,
      status: pulseResult.status,
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

  async postTemperature(temp: Partial<TemperatureDBModel>): Promise<void> {
    const apiUrl = `${APIURL}enterprise/api/v1/internal/temperature`
    const body = JSON.stringify({
      id: temp.id,
      status: temp.status,
      temperature: temp.temperature,
      userId: temp.userId,
      organizationId: temp.organizationId,
    })
    LogInfo(`EnterpriseAdapter`, 'postTemperature', {
      id: temp.id,
      userId: temp.userId,
      organizationId: temp.organizationId,
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
