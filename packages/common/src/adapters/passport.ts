import fetch from 'node-fetch'
import {Config} from 'src/utils/config'
import {BadRequestException} from 'src/exceptions/bad-request-exception'

const APIURL = Config.get('DOMAIN_PASSPORT')

export class PassportAdapter {
  async createPassport(userId: string, organizationId: string, status: string): Promise<void> {
    const url = `${APIURL}/passports/internal/api/v1/passport`
    const body = JSON.stringify({
      organizationId,
      userId,
      status,
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
