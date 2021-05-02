import {SwaggerModule} from '@nestjs/swagger'
import {INestApplication, Injectable} from '@nestjs/common'
import {OpnConfigService} from '@opn-services/common/services'

import {SwaggerConfiguration} from '@opn-services/common/configuration/swagger.configuration'

const MIN_LOGIN_PASS_SIZE = 5

/**
 * TODO:
 * 1. Logging
 */
export const createSwagger = (app: INestApplication): void => {
  const configService = app.get('OpnConfigService') as OpnConfigService
  const isSwaggerEnabled = configService.get('IS_SERVICE_V2_SWAGGER_ENABLED')
  const authCredentials = configService.get('APIDOCS_PASSWORD_V2')

  if (isSwaggerEnabled !== 'enabled') {
    console.warn('Attempt to open doc page on environment with swagger disabled')
    return
  }

  if (!authCredentials) {
    console.log('No swagger basic auth login and password: APIDOCS_PASSWORD_V2')
    return
  }

  const authParts = authCredentials.split(':')
  if (authParts.length != 2) {
    console.log('Not valid APIDOCS_PASSWORD_V2 format, should be login:password')
    return
  }
  const login = authParts[0]
  const password = authParts[1]

  if (login.length < MIN_LOGIN_PASS_SIZE || password.length < MIN_LOGIN_PASS_SIZE) {
    console.log('Too short login or password in APIDOCS_PASSWORD_V2')
    return
  }

  const document = SwaggerModule.createDocument(app, SwaggerConfiguration)

  SwaggerModule.setup('/api/doc', app, document)
}
