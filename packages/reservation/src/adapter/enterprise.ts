import {Config} from '../../../common/src/utils/config'
import fetch from 'node-fetch'
import {LocalUser} from '../../../common/src/data/user'

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
}
