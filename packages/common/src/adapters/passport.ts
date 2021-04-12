import fetch from 'node-fetch'
import {Config} from '../utils/config'
import {BadRequestException} from '../exceptions/bad-request-exception'

const APIURL = Config.get('DOMAIN_PASSPORT')

export default class PassportAdapter {
  async createPassport(
    userId: string,
    organizationId: string,
    status: string, // PassportStatus
    type: string, // PassportType
    attestationId: string = null,
  ): Promise<void> {
    const url = `${APIURL}passport/internal/api/v1/passport`
    const body = JSON.stringify({
      organizationId,
      userId,
      status,
      attestationId,
      type,
    })
    const res = await fetch(url, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body,
    })
    if (!res.ok) {
      throw new BadRequestException(res.statusText)
    }
  }
}
