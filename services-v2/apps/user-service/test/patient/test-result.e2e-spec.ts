import {Test, TestingModule} from '@nestjs/testing'
import {HttpService} from '@nestjs/common'
import {FastifyAdapter, NestFastifyApplication} from '@nestjs/platform-fastify'

import * as request from 'supertest'
import {App} from '../../src/main'

import {
  commonHeaders,
  createUser,
  deleteUserByIdTestDataCreator,
  findAndRemoveByFirstName,
  getTestResultPayload,
} from '@opn-services/test/utils'
import {TestResultCreateDto} from '@opn-services/user/dto/test-result'
import {deleteHomeKitByIdTestDataCreator} from '@opn-services/test/utils/home-kit-code'
import {createRapidTestKitCode} from '@opn-services/test/utils/rapid-home-code'

jest.mock('@opn-services/common/services/firebase/firebase-auth.service')
jest.setTimeout(10000)

const testDataCreator = __filename.split('/services-v2/')[1]

const userId = 'PATIENT_BASIC'
const kitCode = 'XXXXXX'
const organizationId = 'PATIENT_ORG_BASIC'
const headers = {
  accept: 'application/json',
  authorization: `Bearer userId:${userId}`,
  ...commonHeaders,
}

describe('TestResultController (e2e)', () => {
  const url = '/api/v1/pcr-test-results'
  let app: NestFastifyApplication
  let server: HttpService

  const pcrTestResultCreatePayload = {
    firstName: 'PATIENT_E2E',
    lastName: 'PATIENT_E2E',
    reportAs: 'Individual',
    kitCode,
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
        id: kitCode,
        code: kitCode,
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

  test('should create PCR Test Result - / (POST)', async done => {
    const payload = getTestResultPayload(pcrTestResultCreatePayload)
    const response = await request(server)
      .post(url)
      .set(headers)
      .send(payload as TestResultCreateDto)

    expect(response.status).toBe(201)
    done()
  })

  afterAll(async () => {
    await Promise.all([
      deleteUserByIdTestDataCreator(userId, testDataCreator),
      deleteHomeKitByIdTestDataCreator(testDataCreator),
      findAndRemoveByFirstName(pcrTestResultCreatePayload.firstName),
    ])
    await app.close()
  })
})
