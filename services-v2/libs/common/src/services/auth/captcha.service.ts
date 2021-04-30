import fetch from 'node-fetch'
import {Injectable} from '@nestjs/common'
import {ConfigService} from '@nestjs/config'

@Injectable()
export class CaptchaService {
  private verifyUrl: string

  constructor(private configService: ConfigService) {
    this.verifyUrl = this.configService.get('CAPTCHA_VERIFY')
  }

  async verify(token: string): Promise<boolean> {
    const params = new URLSearchParams({
      secret: this.configService.get('CAPTCHA_KEY'),
      response: token,
    })

    const url = `${this.verifyUrl}?${params}`
    const response = await fetch(url, {method: 'POST'})
    const result = await response.json()

    return result.success
  }
}
