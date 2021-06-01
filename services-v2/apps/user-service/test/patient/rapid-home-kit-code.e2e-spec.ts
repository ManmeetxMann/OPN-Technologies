import {Test, TestingModule} from '@nestjs/testing'
import {HttpService} from '@nestjs/common'
import {FastifyAdapter, NestFastifyApplication} from '@nestjs/platform-fastify'

import * as request from 'supertest'
import {App} from '../../src/main'

import {commonHeaders, createUser, deleteUserByIdTestDataCreator} from '@opn-services/test/utils'
import {
  createRapidTestKitCode,
  deleteRapidCodeByIdTestDataCreator,
} from '@opn-services/test/utils/rapid-home-code'

jest.mock('@opn-services/common/services/firebase/firebase-auth.service')
jest.mock('@opn-services/common/services/google/captcha.service')
jest.setTimeout(10000)

const organizationId = 'PATIENT_ORG_BASIC'

const rapidHomeCodeId = 'TEST_RAPID_HOME_CODE'
const rapidHomeKitCode = 'TEST_HOME_KIT_CODE'

describe('RapidHomeKitCodeController (e2e)', () => {
  const url = '/api/v1/rapid-home-kit-codes'
  let app: NestFastifyApplication
  let server: HttpService

  const userId = 'PATIENT_RAPID_HOME_KIT'
  const testDataCreator = __filename.split('/services-v2/')[1]
  const headers = {
    accept: 'application/json',
    authorization: `Bearer userId:${userId}`,
  }

  beforeAll(async () => {
    await createUser(
      {
        id: userId,
        organizationIds: [organizationId],
      },
      testDataCreator,
    )

    await createRapidTestKitCode(
      {
        id: rapidHomeCodeId,
        code: rapidHomeKitCode,
      },
      testDataCreator,
    )

    const testAppModule: TestingModule = await Test.createTestingModule({
      imports: [App],
    }).compile()

    app = testAppModule.createNestApplication(new FastifyAdapter())

    server = app.getHttpServer()
    await new Promise(resolve => app.listen(81, resolve))
  })

  test('should verify rapid home kit code', async done => {
    const response = await request(server)
      .get(`${url}/${rapidHomeKitCode}`)
      .set(headers)
      .set(commonHeaders)
      .set({
        'captcha-token': 'CAPTCHA_TOKEN',
      })

    expect(response.status).toBe(200)
    done()
  })

  test('should return BadRequest (400) without captcha token header', async done => {
    const response = await request(server)
      .get(`${url}/${rapidHomeKitCode}`)
      .set(headers)
      .set(commonHeaders)

    expect(response.status).toBe(400)
    done()
  })

  afterAll(async () => {
    await Promise.all([
      deleteUserByIdTestDataCreator(userId, testDataCreator),
      deleteRapidCodeByIdTestDataCreator(rapidHomeCodeId, testDataCreator),
    ])
    await app.close()
  })
})
