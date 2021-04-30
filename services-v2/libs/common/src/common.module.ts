// NestJs
import {ConfigModule} from '@nestjs/config'
import {Global, Module} from '@nestjs/common'

// Libs
// import * as Joi from 'joi'

// Service
import {CommonService} from './common.service'
import {FirebaseAuthService} from './services/auth/firebase-auth.service'
import {CaptchaService} from './services/auth/captcha.service'

// Guards
import {AuthGuard} from './guard/auth.guard'
import {CaptchaGuard} from './guard/captcha.guard'

import {Config} from '@opn-common-v1/utils/config'

/**
 * TODO:
 * 1. Joi model for env variables
 * 2. ENV as separate lib
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      load: [Config.getAll],
    }),
    AuthGuard,
    CaptchaGuard,
  ],
  providers: [CommonService, FirebaseAuthService, CaptchaService],
  exports: [
    CommonService,
    ConfigModule.forRoot({
      validationOptions: {
        allowUnknown: false,
        abortEarly: true,
      },
    }),
    FirebaseAuthService,
    CaptchaService,
    AuthGuard,
    CaptchaGuard,
  ],
})
export class CommonModule {}
