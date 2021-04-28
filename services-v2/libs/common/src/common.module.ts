// NestJs
import {ConfigModule} from '@nestjs/config'
import {Global, Module} from '@nestjs/common'

// Libs
// import * as Joi from 'joi'

// Service
import {CommonService} from './common.service'
import {FirebaseAuthService} from './services/auth/firebase-auth.service'

// Guards
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
    FirebaseAuthService,
    AuthGuard,
  ],
})
export class CommonModule {}
