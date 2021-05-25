import {SwaggerModule} from '@nestjs/swagger'
import {INestApplication} from '@nestjs/common'

import {OpnConfigService} from '@opn-services/common/services'

import {SwaggerConfiguration} from '@opn-services/common/configuration/swagger.configuration'
import {LogWarning} from '@opn-services/common/utils/logging'
import {SwaggerEvents, SwaggerFunctions} from '@opn-services/common/types/activity-logs'

const MIN_LOGIN_PASS_SIZE = 5

export const createSwagger = (app: INestApplication): void => {
  const configService = app.get('OpnConfigService') as OpnConfigService
  const isSwaggerEnabled = configService.get<string>('IS_SERVICE_V2_SWAGGER_ENABLED')
  const authCredentials = configService.get<string>('APIDOCS_PASSWORD_V2')

  if (isSwaggerEnabled !== 'enabled') {
    LogWarning(SwaggerFunctions.createSwagger, SwaggerEvents.attemptWithSwaggerDisabled, {
      message: 'Attempt to open doc page on environment with swagger disabled',
    })
    return
  }

  if (!authCredentials) {
    LogWarning(SwaggerFunctions.createSwagger, SwaggerEvents.noAuthCredentials, {
      message: 'No swagger basic auth login and password: APIDOCS_PASSWORD_V2',
    })
    return
  }

  const authParts = authCredentials.split(':')
  if (authParts.length != 2) {
    LogWarning(SwaggerFunctions.createSwagger, SwaggerEvents.invalidAuthCredentials, {
      message: 'Not valid APIDOCS_PASSWORD_V2 format, should be login:password',
    })
    return
  }

  const login = authParts[0]
  const password = authParts[1]
  if (login.length < MIN_LOGIN_PASS_SIZE || password.length < MIN_LOGIN_PASS_SIZE) {
    LogWarning(SwaggerFunctions.createSwagger, SwaggerEvents.shortAuthCredentials, {
      message: 'Too short login or password in APIDOCS_PASSWORD_V2',
    })
    return
  }

  const document = SwaggerModule.createDocument(app, SwaggerConfiguration)

  /**
   * Functional middleware for swagger auth
   */
  app.use((req, res, next) => {
    if ((req.originalUrl as string).startsWith('/api/doc/')) {
      const userPass = Buffer.from(
        (req.headers.authorization || '').split(' ')[1] || '',
        'base64',
      ).toString()

      if (userPass != authCredentials || !isSwaggerEnabled) {
        res.writeHead(401, {'WWW-Authenticate': 'Basic realm="nope"'})
        res.end('HTTP Error 401 Unauthorized: Access is denied')
      }
      return next()
    }

    return next()
  })

  SwaggerModule.setup('/api/doc', app, document)
}
