// NestJs
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
import {AuthGlobalGuard} from './guard'

// eslint-disable-next-line no-restricted-imports
import {ConfigModule} from '@nestjs/config'
import {Config} from '@opn-common-v1/utils/config'

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      load: [Config.getAll],
    }),
    OpnConfigService,
    AuthGuard,
    AuthGlobalGuard,
    CaptchaGuard,
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
    AuthGlobalGuard,
    CaptchaGuard,
    InternalGuard,
  ],
})
export class CommonModule {}
