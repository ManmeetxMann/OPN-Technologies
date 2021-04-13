// NestJs
import {ConfigModule} from '@nestjs/config'
import {Module, Global} from '@nestjs/common'

// Libs
// import Joi from 'joi'

// Service
import {CommonService} from './common.service'
import {FirebaseAuthService} from './services/auth/firebase-auth.service'
import {AuthGuard} from './guard/auth.guard'

/**
 * TODO:
 * 1. Joi model for env variables
 * 2. ENV as separate lib
 */
@Global()
@Module({
  imports: [ConfigModule.forRoot(), AuthGuard],
  providers: [CommonService, FirebaseAuthService],
  exports: [
    CommonService,
    ConfigModule.forRoot({
      validationOptions: {
        allowUnknown: false,
        abortEarly: true,
      },
    }),
    FirebaseAuthService
  ],
})
export class CommonModule {}
