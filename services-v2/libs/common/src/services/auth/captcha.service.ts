import fetch from 'node-fetch'
import {Injectable} from '@nestjs/common'
import {ConfigService} from '@nestjs/config'

@Injectable()
export class CaptchaService {
  constructor(private configService: ConfigService) {}

  async verify(token: string): Promise<boolean> {
    const serviceUrl = this.configService.get('CAPTCHA_VERIFY')
    const params = new URLSearchParams({
      secret: this.configService.get('CAPTCHA_KEY'),
      response: token,
    })

    const url = `${serviceUrl}?${params}`
    const response = await fetch(url, {method: 'POST'})
    const result = await response.json()

    return result.success
  }
}
