import {Test, TestingModule} from '@nestjs/testing'
import {HttpService} from '@nestjs/common'
import {FastifyAdapter, NestFastifyApplication} from '@nestjs/platform-fastify'

import * as request from 'supertest'
import {App} from '../../src/main'

import {
  createUser,
  deleteUserByIdTestDataCreator,
  findAndRemoveByFirstName,
  getTestResultPayload,
} from '@opn-services/test/utils'
import {TestResultCreateDto} from '@opn-services/user/dto/test-result'
import {createKit, deleteHomeKitByIdTestDataCreator} from '@opn-services/test/utils/home-kit-code'
import {
  createKitAssoc,
  deleteHomeKitAssocByIdTestDataCreator,
} from '@opn-services/test/utils/home-kit-code-assoc'

jest.mock('@opn-services/common/services/firebase/firebase-auth.service')
jest.setTimeout(10000)

const testDataCreator = __filename.split('/services-v2/')[1]

const userId = 'PATIENT_BASIC'
const kitCode = 'XXXXXX'
const kitCodeAssoc = 'XXXXXX_Assoc'
const organizationId = 'PATIENT_ORG_BASIC'
const headers = {
  accept: 'application/json',
  authorization: `Bearer userId:${userId}`,

  ['opn-app-version']: '1.0.0',
  ['opn-device-id']: 'q9ZZO3MsR703fqtEhGRz7',
  ['opn-lang']: 'en',
  ['opn-request-id']: 'yV_9j30roWSiCdY-4b5HL',
  ['opn-source']: 'FH_IOS',
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

    await createKit(
      {
        id: kitCode,
        code: kitCode,
      },
      testDataCreator,
    )

    await createKitAssoc(
      {
        id: kitCodeAssoc,
        code: kitCode,
        userId,
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
      deleteHomeKitAssocByIdTestDataCreator(testDataCreator),
      findAndRemoveByFirstName(pcrTestResultCreatePayload.firstName),
    ])
    await app.close()
  })
})
