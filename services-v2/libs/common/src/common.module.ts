// NestJs
import {ConfigModule} from '@nestjs/config'
import {Global, Module} from '@nestjs/common'

// Service
import {CommonService} from './common.service'
import {FirebaseAuthService} from './services/firebase/firebase-auth.service'
import {OpnConfigService} from '@opn-services/common/services'
import {CaptchaService} from './services/google/captcha.service'

// Guards
import {AuthGuard} from './guard/auth.guard'
import {CaptchaGuard} from './guard/captcha.guard'
import {InternalGuard} from './guard/internal.guard'

import {Config} from '@opn-common-v1/utils/config'

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      load: [Config.getAll],
    }),
    OpnConfigService,
    AuthGuard,
    InternalGuard,
  ],
  providers: [CommonService, OpnConfigService, FirebaseAuthService, CaptchaService],
  exports: [
    CommonService,
    ConfigModule.forRoot(),
    OpnConfigService,
    FirebaseAuthService,
    CaptchaService,
    AuthGuard,
    CaptchaGuard,
    InternalGuard,
  ],
})
export class CommonModule {}
