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
import {PatientTestUtility} from '../utils/patient'

jest.mock('@opn-services/common/services/firebase/firebase-auth.service')
jest.mock('@opn-services/common/services/google/captcha.service')
jest.setTimeout(10000)

const organizationId = 'PATIENT_ORG_BASIC'

const kitCode = 'ZZZZZZ'

const rapidHome2CodeId = 'TEST_RAPID_HOME_CODE2'
const rapidHome2KitCode = 'TEST_HOME_KIT_CODE2'
const currentUserName = 'HomeKitPublicPatientTest'

// eslint-disable-next-line max-lines-per-function
describe('RapidHomeKitCodeController (e2e)', () => {
  const url = '/api/v1'
  let app: NestFastifyApplication
  let server: HttpService
  let patientTestUtility: PatientTestUtility

  const setHeadersByUserId = (userId: string) => {
    return {
      accept: 'application/json',
      authorization: `Bearer userId:${userId}`,
      ...commonHeaders,
    }
  }

  const userId = 'PATIENT_RAPID_HOME_KIT'
  const secondUserId = 'PATIENT_RAPID_HOME_KIT_2'
  const userEmail = 'patientRapidHome@gmail.com'

  const testDataCreator = __filename.split('/services-v2/')[1]
  const headers = {
    accept: 'application/json',
    authorization: `Bearer userId:${userId}`,
  }

  const pcrTestResultCreatePayload = {
    firstName: 'RAPID_HOME_KIT_PATIENT_E2E',
    lastName: 'RAPID_HOME_KIT_PATIENT_E2E',
    reportAs: 'Individual',
    kitCode,
  }

  beforeAll(async () => {
    await createUser(
      {
        id: userId,
        organizationIds: [organizationId],
        email: userEmail,
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

    await createUser(
      {
        id: secondUserId,
        organizationIds: [organizationId],
      },
      testDataCreator,
    )

    await createRapidTestKitCode(
      {
        id: rapidHome2CodeId,
        code: rapidHome2KitCode,
      },
      testDataCreator,
    )

    const testAppModule: TestingModule = await Test.createTestingModule({
      imports: [App],
    }).compile()

    app = testAppModule.createNestApplication(new FastifyAdapter())

    server = app.getHttpServer()

    patientTestUtility = new PatientTestUtility()

    await patientTestUtility.createPatient({
      firstName: currentUserName,
      email: userEmail,
      firebaseKey: userId,
    })

    await new Promise(resolve => app.listen(81, resolve))
  })

  test('should verify rapid home kit code and link to account', async done => {
    const response = await request(server)
      .get(`${url}/rapid-home-kit-codes/${kitCode}`)
      .set(headers)
      .set(commonHeaders)
      .set({
        'captcha-token': 'CAPTCHA_TOKEN',
      })

    expect(response.status).toBe(200)
    const encryptedToken = response.body.data.encryptedToken
    const linkResponse = await request(server)
      .post(`${url}/rapid-home-kit-user-codes/link-to-account`)
      .set(headers)
      .set(commonHeaders)
      .send({
        encryptedToken: encryptedToken,
      })

    expect(linkResponse.status).toBe(201)

    done()
  })

  test('should return BadRequest (400) without captcha token header', async done => {
    const response = await request(server)
      .get(`${url}/rapid-home-kit-codes/${kitCode}`)
      .set(headers)
      .set(commonHeaders)

    expect(response.status).toBe(400)
    done()
  })

  test('user should use rapid home kit code 5 time successfully', async done => {
    const payload = getTestResultPayload(pcrTestResultCreatePayload)
    const result = []
    let usedCount = 0

    // now use kit 5 time
    while (usedCount < 5) {
      usedCount++
      const promise = await request(server)
        .post(`${url}/pcr-test-results`)
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
      .post(`${url}/pcr-test-results`)
      .set(setHeadersByUserId(userId))
      .send(payload as TestResultCreateDto)

    expect(promise.status).toBe(400)
    expect(promise.body.message).toBe(errorMessage)

    done()
  })

  test('associate same user second time should return error', async done => {
    const error = {statusCode: 400, message: 'Kit Already Linked'}
    // It already used more than 5 times, Clearing usage history to avoid getting another error
    await clearRapidCodeDataById(kitCode)

    const response = await request(server)
      .post(`${url}/rapid-home-kit-codes`)
      .set(setHeadersByUserId(userId))
      .send({code: kitCode} as {code: string})

    expect(response.status).toBe(error.statusCode)
    expect(response.body.message).toBe(error.message)

    done()
  })

  test('Link to many users', async done => {
    // here its already linked to one account
    const response = await request(server)
      .post(`${url}/rapid-home-kit-codes`)
      .set(setHeadersByUserId(secondUserId))
      .send({code: kitCode} as {code: string})

    expect(response.status).toBe(201)
    done()
  })

  test('Attach kit code - / (POST)', async done => {
    const response = await request(server)
      .post(`${url}/rapid-home-kit-codes`)
      .set(headers)
      .set(commonHeaders)
      .send({
        code: rapidHome2KitCode,
      })

    expect(response.status).toBe(201)
    done()
  })

  test('Get kit codes - / (GET)', async done => {
    const response = await request(server)
      .get(`${url}/rapid-home-kit-user-codes`)
      .set(headers)
      .set(commonHeaders)

    expect(response.body.data.codes.length).toBeGreaterThan(1)
    expect(response.status).toBe(200)
    done()
  })

  test('Coupon - / (POST)', async done => {
    const payload = getTestResultPayload(pcrTestResultCreatePayload)
    const pcrResponse = await request(server)
      .post(`${url}/pcr-test-results`)
      .set(headers)
      .set(commonHeaders)
      .send(payload as TestResultCreateDto)

    expect(pcrResponse.status).toBe(201)
    const pcrId = pcrResponse.body.data.id

    const response = await request(server)
      .post(`${url}/home-test-patients/coupon`)
      .set(headers)
      .set(commonHeaders)
      .send({
        id: pcrId,
        email: userEmail,
      })
    expect(response.status).toBe(201)
    expect(typeof response.body.data.couponCode).toBe('string')
    done()
  })

  afterAll(async () => {
    await Promise.all([
      deleteUserByIdTestDataCreator(userId, testDataCreator),
      deleteRapidCodeByIdTestDataCreator(kitCode, testDataCreator),
      patientTestUtility.findAndRemoveProfile({firstName: currentUserName}),
      patientTestUtility.findAndRemoveProfile({firebaseKey: userId}),
      patientTestUtility.findAndRemoveProfile({firstName: pcrTestResultCreatePayload.firstName}),
    ])
    await patientTestUtility.patientRepository.delete({firstName: currentUserName})
    await patientTestUtility.patientRepository.delete({
      firstName: pcrTestResultCreatePayload.firstName,
    })
    await app.close()
  })
})
