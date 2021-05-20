import fetch from 'node-fetch'
import {Injectable} from '@nestjs/common'
import {OpnConfigService} from '@opn-services/common/services'

import {LogError} from '@opn-services/common/utils/logging'
import {CaptchaEvents, CaptchaFunctions} from '@opn-services/common/types/activity-logs'

@Injectable()
export class CaptchaService {
  private verifyUrl: string

  constructor(private configService: OpnConfigService) {
    this.verifyUrl = this.configService.get('CAPTCHA_VERIFY_URL')
  }

  async verify(token: string): Promise<boolean> {
    const params = new URLSearchParams({
      secret: this.configService.get('CAPTCHA_KEY'),
      response: token,
    })

    try {
      const url = `${this.verifyUrl}?${params}`
      const response = await fetch(url, {method: 'POST'})
      const result = await response.json()

      return result.success
    } catch (error) {
      LogError(CaptchaFunctions.verify, CaptchaEvents.captchaServiceFailed, error)
      return false
    }
  }
}
