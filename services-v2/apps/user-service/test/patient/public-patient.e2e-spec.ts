import {Test, TestingModule} from '@nestjs/testing'
// import {HttpService} from '@nestjs/common'
import {FastifyAdapter, NestFastifyApplication} from '@nestjs/platform-fastify'

// import * as request from 'supertest'
import {App} from '../../src/main'

import {
  // commonHeaders,
  createUser,
  deleteUserByEmail,
  deleteUserByIdTestDataCreator,
} from '@opn-services/test/utils'

import {PatientTestUtility} from '../utils/patient'

jest.mock('@opn-services/common/services/firebase/firebase-auth.service')
jest.mock('@opn-enterprise-v1/repository/user.repository', () => {
  return {
    UserRepository: jest.fn().mockImplementation(() => {
      return {
        add: () => ({
          id: 'RandomFirebaseKeyPublicTest',
        }),
      }
    }),
  }
})

jest.setTimeout(10000)

const userId = 'NORMAL_PATIENT_BASIC'
const organizationId = 'NORMAL_PATIENT_ORG_BASIC'
const testDataCreator = __filename.split('/services-v2/')[1]
// const headers = {
//   accept: 'application/json',
//   organizationid: organizationId,
//   authorization: `Bearer userId:${userId}`,
//   ...commonHeaders,
// }

describe('PatientController (e2e)', () => {
  // const url = '/api/v1/patients'
  let app: NestFastifyApplication
  // let server: HttpService
  let patientTestUtility: PatientTestUtility

  const userCreatePayload = {
    email: 'NORMAL_PATIENT_TEST_MAIL_E2E@stayopn.com',
    firstName: 'NORMAL_PATIENT_E2E',
    lastName: 'NORMAL_PATIENT_E2E',
  }

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

    // server = app.getHttpServer()
    await new Promise(resolve => app.listen(81, resolve))

    patientTestUtility = new PatientTestUtility()
    await patientTestUtility.removeProfileByEmail(userCreatePayload.email)
  })

  test('Dummy placeholder', async done => {
    expect(true).toBe(true)
    done()
  })
  // test('Create patient - / (POST)', async done => {
  //   const response = await request(server)
  //     .post(url)
  //     .set(headers)
  //     .send(userCreatePayload)
  //   expect(response.status).toBe(201)
  //   done()
  // })

  afterAll(async () => {
    await Promise.all([
      deleteUserByIdTestDataCreator(userId, testDataCreator),
      deleteUserByEmail(userCreatePayload.email),
      patientTestUtility.findAndRemoveProfile({firstName: userCreatePayload.firstName}),
    ])
    await patientTestUtility.patientRepository.delete({firstName: userCreatePayload.firstName})
    await app.close()
  })
})
