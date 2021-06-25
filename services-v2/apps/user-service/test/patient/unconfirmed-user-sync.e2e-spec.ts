import {Test, TestingModule} from '@nestjs/testing'
import {HttpService} from '@nestjs/common'
import {FastifyAdapter, NestFastifyApplication} from '@nestjs/platform-fastify'

import * as request from 'supertest'
import {App} from '../../src/main'

import {
  commonHeaders,
  createUser,
  deleteUserByIdTestDataCreator,
  getAuthShortCodeByEmail,
} from '@opn-services/test/utils'

import {PatientTestUtility} from '../utils/patient'
import {UserCreator, UserStatus} from '@opn-common-v1/data/user-status'
import {createOrganization, deleteOrganization} from '@opn-services/test/utils/organization'

jest.mock('@opn-services/common/services/firebase/firebase-auth.service')

const newUserId = 'NORMAL_PATIENT_BASIC_NEW'
const confirmedUserId = 'NORMAL_PATIENT_BASIC_CONFIRMED'
const newUserFirstName = 'NORMAL_PATIENT_E2E_NEW'
const confirmedUserFirstName = 'NORMAL_PATIENT_E2E_CONFIRMED'
const email = 'Test@mail.com'
const organizationId = 'NORMAL_PATIENT_ORG_BASIC'
const testDataCreator = __filename.split('/services-v2/')[1]

const headers = {
  accept: 'application/json',
  organizationid: organizationId,
  authorization: `Bearer userId:${confirmedUserId}`,
  ...commonHeaders,
}

jest.setTimeout(20000)

describe('Check user sync (e2e)', () => {
  const url = '/api/v1/patients'
  let app: NestFastifyApplication
  let server: HttpService
  let patientTestUtility: PatientTestUtility

  beforeAll(async () => {
    await createUser(
      {
        id: newUserId,
        organizationIds: [organizationId],
        status: UserStatus.NEW,
        firstName: newUserFirstName,
        syncUser: UserCreator.syncFromTestsRequiredPatient,
      },
      testDataCreator,
    )

    await createUser(
      {
        id: confirmedUserId,
        organizationIds: [organizationId],
        status: UserStatus.CONFIRMED,
        firstName: confirmedUserFirstName,
        syncUser: UserCreator.syncFromTestsRequiredPatient,
      },
      testDataCreator,
    )

    await createOrganization(
      {
        id: organizationId,
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
  })

  test('send verification email', async done => {
    let status
    let time = 0
    await new Promise((resolve, reject) => {
      const refreshIntervalId = setInterval(async () => {
        time++
        const response = await request(server)
          .put(`${url}/email/verify`)
          .set(headers)
          .send()

        if (response.status == 200 || time == 10) {
          status = 200
          clearInterval(refreshIntervalId)
          resolve(status)
        }
      }, 2000)
    })

    expect(status).toBe(200)
    done()
  })

  test('confirm verification', async done => {
    const [authCode] = (await getAuthShortCodeByEmail(email)).docs
    const {shortCode: code} = authCode.data()

    const response = await request(server)
      .put(`${url}/email/verified`)
      .set(headers)
      .send({
        patientId: confirmedUserId,
        organizationId: organizationId,
        code,
      })
    expect(response.status).toBe(200)
    done()
  })

  test('Create user and check sync!', async done => {
    const response = await request(server)
      .get(`${url}/unconfirmed`)
      .set(headers)
      .send()

    expect(response.status).toBe(200)
    expect(response.body.data.length).toBeGreaterThanOrEqual(1)
    done()
  })

  afterAll(async () => {
    await Promise.all([
      deleteUserByIdTestDataCreator(newUserId, testDataCreator),
      deleteUserByIdTestDataCreator(confirmedUserId, testDataCreator),
      patientTestUtility.findAndRemoveProfile({firstName: newUserFirstName}),
      patientTestUtility.findAndRemoveProfile({firstName: confirmedUserFirstName}),
      patientTestUtility.removeProfileByAuth({authUserId: newUserId}),
      patientTestUtility.removeProfileByAuth({authUserId: confirmedUserId}),
      deleteOrganization(organizationId),
    ])
    await patientTestUtility.patientRepository.delete({firstName: newUserFirstName})
    await patientTestUtility.patientRepository.delete({firstName: confirmedUserFirstName})
    await app.close()
  })
})
