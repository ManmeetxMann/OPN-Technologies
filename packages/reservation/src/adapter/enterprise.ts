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
  }): Promise<{data: LocalUser}> {
    const apiUrl = `${APIURL}enterprise/internal/api/v1/user`
    const body = JSON.stringify({
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      organizationId: userData.organizationId,
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
