import {SwaggerModule} from '@nestjs/swagger'
import {INestApplication} from '@nestjs/common'
import {ConfigService} from '@nestjs/config'

import {SwaggerConfiguration} from '@opn/common/configuration/swagger.configuration'
import * as basicAuth from 'express-basic-auth'

const MIN_LOGIN_PASS_SIZE = 5

/**
 * TODO:
 * 1. Add ability to disable on prod and/or stage
 */
export const createSwagger = (app: INestApplication): void => {
  const configService = new ConfigService()
  const authCredentials = configService.get('SWAGGER_BASIC_AUTH_CREDENTIALS')

  if (!authCredentials) {
    console.log('No swagger basic auth login and password: SWAGGER_BASIC_AUTH_CREDENTIALS')
    return
  }

  const authParts = authCredentials.split(':')
  if (authParts.length != 2) {
    console.log('Not valid SWAGGER_BASIC_AUTH_CREDENTIALS format, should be login:password')
    return
  }
  const login = authParts[0]
  const password = authParts[1]

  if (login.length < MIN_LOGIN_PASS_SIZE || password.length < MIN_LOGIN_PASS_SIZE) {
    console.log('Too short login or password in SWAGGER_BASIC_AUTH_CREDENTIALS')
    return
  }

  app.use(
    '/api/doc',
    basicAuth({
      challenge: true,
      users: {
        [login]: password,
      },
    }),
  )
  const document = SwaggerModule.createDocument(app, SwaggerConfiguration)
  SwaggerModule.setup('/api/doc', app, document)
}
