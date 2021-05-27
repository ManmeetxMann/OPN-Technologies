import {Test, TestingModule} from '@nestjs/testing'
import {HttpService} from '@nestjs/common'
import {FastifyAdapter, NestFastifyApplication} from '@nestjs/platform-fastify'

import * as request from 'supertest'
import {App} from '../../src/main'

import {commonHeaders, createUser, deleteUserByIdTestDataCreator} from '@opn-services/test/utils'

import {Patient} from '../../src/model/patient/patient.entity'
import {PatientTestUtility} from '../utils/patient'
import {PatientCreateDto} from '../../src/dto/patient'

jest.mock('@opn-services/common/services/firebase/firebase-auth.service')
jest.setTimeout(20000)

const userId = 'PATIENT_BASIC'
const organizationId = 'PATIENT_ORG_BASIC'
const testDataCreator = __filename.split('/services-v2/')[1]
const headers = {
  accept: 'application/json',
  organizationid: organizationId,
  authorization: `Bearer userId:${userId}`,
  ...commonHeaders,
}

describe('AdminPatientController (e2e)', () => {
  const url = '/admin/api/v1/patients'
  let app: NestFastifyApplication
  let server: HttpService
  let mockedUser: Patient
  let patientTestUtility: PatientTestUtility

  const userCreatePayload = {
    email: 'PATIENT_TEST_MAIL_E2E@stayopn.com',
    firstName: 'PATIENT_E2E',
    lastName: 'PATIENT_E2E',
  }
  const userMockedMail = 'PATIENT_TEST_MAIL_MOC_E2E@stayopn.com'

  beforeAll(async () => {
    await createUser(
      {
        id: userId,
        organizationIds: [organizationId],
      },
      testDataCreator,
    )

    const testAppModule: TestingModule = await Test.createTestingModule({
      imports: [App],
    }).compile()

    app = testAppModule.createNestApplication(new FastifyAdapter())

    server = app.getHttpServer()
    await new Promise(resolve => app.listen(81, resolve))

    patientTestUtility = new PatientTestUtility()

    mockedUser = await patientTestUtility.createPatient({email: userMockedMail})
  })

  test('fail to get all patients without bearer - / (GET)', async done => {
    const response = await request(server)
      .get(url)
      .set({
        accept: 'application/json',
        organizationid: organizationId,
        ...commonHeaders,
      })
      .send()

    expect(response.status).toBe(401)
    done()
  })

  test('fail to get all patients with bad bearer - / (GET)', async done => {
    const response = await request(server)
      .get(url)
      .set({
        ...headers,
        authorization: `userId:${userId}`,
      })
      .send()

    expect(response.status).toBe(401)
    done()
  })

  test('should create patient - / (POST)', async done => {
    const payload = patientTestUtility.getProfilePayload(userCreatePayload)
    const response = await request(server)
      .post(url)
      .set(headers)
      .send(payload as PatientCreateDto)

    expect(response.status).toBe(201)
    done()
  })

  test('should get all patients - / (GET)', async done => {
    const response = await request(server)
      .get(url)
      .set(headers)
      .send()

    expect(response.status).toBe(200)
    done()
  })

  test('should get single patient - /:patientId (GET)', async done => {
    const response = await request(server)
      .get(`${url}/${mockedUser.idPatient}`)
      .set(headers)
      .send()

    expect(response.status).toBe(200)
    done()
  })

  test('should update patient - /:patientId (PUT)', async done => {
    const response = await request(server)
      .get(`${url}/${mockedUser.idPatient}`)
      .set(headers)
      .send()

    expect(response.status).toBe(200)
    done()
  })

  afterAll(async () => {
    await Promise.all([
      deleteUserByIdTestDataCreator(userId, testDataCreator),
      patientTestUtility.findAndRemoveProfile({firstName: userCreatePayload.firstName}),
    ])
    await patientTestUtility.patientRepository.delete(mockedUser.idPatient)
    await app.close()
  })
})
