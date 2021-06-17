import {Test, TestingModule} from '@nestjs/testing'
import {HttpService} from '@nestjs/common'
import {FastifyAdapter, NestFastifyApplication} from '@nestjs/platform-fastify'

import * as request from 'supertest'
import {App} from '../../src/main'

import {
  commonHeaders,
  createUser,
  deleteUserByIdTestDataCreator,
  getTestResultPayload,
} from '@opn-services/test/utils'
import {
  clearRapidCodeDataById,
  createRapidTestKitCode,
  deleteRapidCodeByIdTestDataCreator,
} from '@opn-services/test/utils/rapid-home-code'
import {TestResultCreateDto} from '@opn-services/user/dto/test-result'

jest.mock('@opn-services/common/services/firebase/firebase-auth.service')
jest.mock('@opn-services/common/services/google/captcha.service')
jest.setTimeout(10000)

const organizationId = 'PATIENT_ORG_BASIC'

const rapidHomeCodeId = 'TEST_RAPID_HOME_CODE'
const rapidHomeKitCode = 'TEST_HOME_KIT_CODE'

describe('RapidHomeKitCodeController (e2e)', () => {
  const baseUrl = '/api/v1/'
  const url = `${baseUrl}rapid-home-kit-codes`

  let app: NestFastifyApplication
  let server: HttpService

  const setHeadersByUserId = (userId: string) => {
    return {
      accept: 'application/json',
      authorization: `Bearer userId:${userId}`,
      ...commonHeaders,
    }
  }

  const userId = 'PATIENT_RAPID_HOME_KIT'
  const secondUserId = 'PATIENT_RAPID_HOME_KIT_2'

  const testDataCreator = __filename.split('/services-v2/')[1]
  const headers = {
    accept: 'application/json',
    authorization: `Bearer userId:${userId}`,
  }
  const pcrTestResultCreatePayload = {
    firstName: 'PATIENT_E2E',
    lastName: 'PATIENT_E2E',
    reportAs: 'Individual',
    kitCode: rapidHomeKitCode,
  }

  beforeAll(async () => {
    await createUser(
      {
        id: userId,
        organizationIds: [organizationId],
      },
      testDataCreator,
    )

    await createUser(
      {
        id: secondUserId,
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

  test('should return BadRequest (400) without captcha token header', async done => {
    const response = await request(server)
      .get(`${url}/${rapidHomeKitCode}`)
      .set(headers)
      .set(commonHeaders)

    expect(response.status).toBe(400)
    done()
  })

  test('user should use rapid home kit code 5 time successfully', async done => {
    const payload = getTestResultPayload(pcrTestResultCreatePayload)
    const result = []
    let usedCount = 0

    // first assoc kit to user
    const response = await request(server)
      .post(`${baseUrl}rapid-home-kit-codes`)
      .set(setHeadersByUserId(userId))
      .send({code: rapidHomeKitCode} as {code: string})
    expect(response.status).toBe(201)

    // now use kit 5 time
    while (usedCount < 5) {
      usedCount++
      const promise = await request(server)
        .post(`${baseUrl}pcr-test-results`)
        .set(setHeadersByUserId(userId))
        .send(payload as TestResultCreateDto)

      result.push(promise)
    }

    result.forEach(promise => {
      expect(promise.status).toBe(201)
    })
    done()
  }, 30000)

  test('should return BadRequest (400) ', async done => {
    const errorMessage = 'Error this kit has already recorded 5 test results against it.'
    const payload = getTestResultPayload(pcrTestResultCreatePayload)

    const promise = await request(server)
      .post(`${baseUrl}pcr-test-results`)
      .set(setHeadersByUserId(userId))
      .send(payload as TestResultCreateDto)

    expect(promise.status).toBe(400)
    expect(promise.body.message).toBe(errorMessage)

    done()
  })

  test('associate same user second time should return error', async done => {
    const error = {statusCode: 400, message: 'Kit Already Linked'}
    // It already used more than 5 times, Clearing usage history to avoid getting another error
    await clearRapidCodeDataById(rapidHomeCodeId)

    const response = await request(server)
      .post(`${baseUrl}rapid-home-kit-codes`)
      .set(setHeadersByUserId(userId))
      .send({code: rapidHomeKitCode} as {code: string})

    expect(response.status).toBe(error.statusCode)
    expect(response.body.message).toBe(error.message)

    done()
  })

  test('Link to many users', async done => {
    // here its already linked to one account
    const response = await request(server)
      .post(`${baseUrl}rapid-home-kit-codes`)
      .set(setHeadersByUserId(secondUserId))
      .send({code: rapidHomeKitCode} as {code: string})

    expect(response.status).toBe(201)
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
