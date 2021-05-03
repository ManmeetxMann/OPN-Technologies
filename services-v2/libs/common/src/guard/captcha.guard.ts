import {Injectable, CanActivate, ExecutionContext} from '@nestjs/common'
import {BadRequestException, ForbiddenException} from '../exception'
import {CaptchaService} from '../services/auth/captcha.service'

@Injectable()
export class CaptchaGuard implements CanActivate {
  constructor(private captchaService: CaptchaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest()

    const token = req.headers['captcha-token']
    if (!token) {
      throw new BadRequestException('captcha-token is required')
    }

    const isValidCaptcha = await this.captchaService.verify(token)
    if (!isValidCaptcha) {
      throw new ForbiddenException('CAPTCHA verification has been failed')
    }

    return isValidCaptcha
  }
}
