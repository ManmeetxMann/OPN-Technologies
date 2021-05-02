// NestJs
import {ConfigModule} from '@nestjs/config'
import {Global, Module} from '@nestjs/common'

// Service
import {CommonService} from './common.service'
import {FirebaseAuthService} from './services/firebase/firebase-auth.service'
import {OpnConfigService} from '@opn-services/common/services'

// Guards
import {AuthGuard} from './guard/auth.guard'
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
  providers: [CommonService, OpnConfigService, FirebaseAuthService],
  exports: [
    CommonService,
    ConfigModule.forRoot(),
    OpnConfigService,
    FirebaseAuthService,
    AuthGuard,
    InternalGuard,
  ],
})
export class CommonModule {}
