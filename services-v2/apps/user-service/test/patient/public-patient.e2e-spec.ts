import {Test, TestingModule} from '@nestjs/testing'
import {HttpService} from '@nestjs/common'
import {FastifyAdapter, NestFastifyApplication} from '@nestjs/platform-fastify'

import * as request from 'supertest'
import {App} from '../../src/main'

import {
  commonHeaders,
  // createUser,
  // deleteUserByEmailTestDataCreator,
  deleteUserByIdTestDataCreator,
  // getAuthShortCodeByEmail,
  // deleteUserByEmail,
  createUser,
} from '@opn-services/test/utils'

import {PatientTestUtility} from '../utils/patient'
// import {DependantCreateDto} from '@opn-services/user/dto/patient'
import {createOrganization, deleteOrganization} from '@opn-services/test/utils/organization'
// import {Patient} from '@opn-services/user/model/patient/patient.entity'
// import {UserStatus} from '@opn-common-v1/data/user-status'

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

const organizationId = 'PATIENT_ORG_BASIC'
const newOrganizationId = 'NEW_PATIENT_ORG_BASIC'
const newOrganizationCode = 33333
const testDataCreator = __filename.split('/services-v2/')[1]
const userId = 'PATIENT_BASIC_PUBLIC_PATIENT'
const headers = {
  accept: 'application/json',
  organizationid: organizationId,
  authorization: `Bearer userId:${userId}`,
  ...commonHeaders,
}
// const headers = {
//   accept: 'application/json',
//   organizationid: organizationId,
//   authorization: `Bearer userId:${userId}`,
//   ...commonHeaders,
// }

describe('PatientController (e2e)', () => {
  const url = '/api/v1/patients'
  let app: NestFastifyApplication
  let server: HttpService
  let patientTestUtility: PatientTestUtility
  // let insertedUserSqlId
  // let mockedUser: Patient

  const userCreatePayload = {
    email: 'NORMAL_PATIENT_TEST_MAIL_E2E@stayopn.com',
    firstName: 'NORMAL_PATIENT_E2E',
    lastName: 'NORMAL_PATIENT_E2E',
  }

  const userUpdatePayload = {
    lastName: 'NEW_LASTNAME_E2E',
  }

  const revertUserUpdatePayload = {
    lastName: 'NORMAL_PATIENT_E2E',
  }

  const dependantCreatePayload = {
    firstName: 'NORMAL_DEPENDANT_E2E',
    lastName: 'NORMAL_DEPENDANT_E2E',
  }

  const userMockedMail = 'NORMAL_PATIENT_TEST_MAIL_E2E@stayopn.com'
  const userMockName = 'UnconfirmedUserMock'

  beforeAll(async () => {
    await createUser(
      {
        id: userId,
        organizationIds: [organizationId],
      },
      testDataCreator,
    )

    await createOrganization(
      {
        id: organizationId,
      },
      testDataCreator,
    )

    await createOrganization(
      {
        id: newOrganizationId,
        key: newOrganizationCode,
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
    // await patientTestUtility.removeProfileByEmail(userCreatePayload.email)
  })

  test('Dummy Test case', async done => {
    expect(true).toBe(true)
    done()
  })

  // test('Create patient - / (POST)', async done => {
  //   const response = await request(server)
  //     .post(url)
  //     .set(headers)
  //     .send(userCreatePayload)
  //   insertedUserSqlId = response.body.data.id
  //   expect(response.status).toBe(201)
  //   done()
  // })

  // test('Update patient - / (POST)', async done => {
  //   const response = await request(server)
  //     .put(url)
  //     .set(headers)
  //     .send(userUpdatePayload)
  //
  //   expect(response.body.data.lastName).toBe(userUpdatePayload.lastName)
  //
  //   const revertResponse = await request(server)
  //     .put(url)
  //     .set(headers)
  //     .send(revertUserUpdatePayload)
  //
  //   expect(revertResponse.body.data.lastName).toBe(revertUserUpdatePayload.lastName)
  //   expect(revertResponse.status).toBe(200)
  //   expect(response.status).toBe(200)
  //   done()
  // })

  // test('Get patient - / (GET)', async done => {
  //   const response = await request(server)
  //     .get(url)
  //     .set(headers)
  //
  //   expect(response.status).toBe(200)
  //   expect(response.body.data.firstName).toBe(userCreatePayload.firstName)
  //   expect(response.body.data.lastName).toBe(userCreatePayload.lastName)
  //   done()
  // })

  // test('Add dependant - / (POST)', async done => {
  //   const response = await request(server)
  //     .post(`${url}/dependants`)
  //     .set(headers)
  //     .send(dependantCreatePayload as DependantCreateDto)
  //
  //   expect(response.body.data.firstName).toBe(dependantCreatePayload.firstName)
  //   expect(response.body.data.lastName).toBe(dependantCreatePayload.lastName)
  //   expect(response.status).toBe(201)
  //   done()
  // })
  //
  // test('Get dependants - / (POST)', async done => {
  //   const response = await request(server)
  //     .get(`${url}/dependants`)
  //     .set(headers)
  //
  //   expect(response.status).toBe(200)
  //   done()
  // })

  // test('should send verification email - (PUT)', async done => {
  //   const response = await request(server)
  //     .put(`${url}/email/verify`)
  //     .set(headers)
  //     .send()
  //
  //   expect(response.status).toBe(200)
  //   done()
  // })

  // test('should not be able to confirm verification with wrong shortCode - (PUT)', async done => {
  //   const response = await request(server)
  //     .put(`${url}/email/verified`)
  //     .set(headers)
  //     .send({
  //       patientId: insertedUserSqlId,
  //       organizationId: organizationId,
  //       code: 'INVALIDCODE',
  //     })
  //
  //   expect(response.body.message).toBe('ShortCode not found')
  //   expect(response.status).toBe(404)
  //   done()
  // })

  // test('should be able to confirm verification - (PUT)', async done => {
  //   const [authCode] = (await getAuthShortCodeByEmail(userCreatePayload.email)).docs
  //   const {shortCode: code} = authCode.data()
  //
  //   const response = await request(server)
  //     .put(`${url}/email/verified`)
  //     .set(headers)
  //     .send({
  //       patientId: insertedUserSqlId,
  //       organizationId: organizationId,
  //       code,
  //     })
  //
  //   expect(response.status).toBe(200)
  //   done()
  // })

  // test('should be able to add organization - (PUT)', async done => {
  //   const response = await request(server)
  //     .put(`${url}/patient/organization`)
  //     .set(headers)
  //     .send({
  //       organizationCode: newOrganizationCode,
  //     })
  //
  //   expect(response.status).toBe(200)
  //   done()
  // })

  // test('Get unconfirmed users - / (GET)', async done => {
  //   mockedUser = await patientTestUtility.createPatient(
  //     {
  //       email: userMockedMail,
  //       firstName: userMockName,
  //       status: UserStatus.NEW,
  //     },
  //     {
  //       withAuth: true,
  //     },
  //   )
  //   await createUser(
  //     {
  //       id: mockedUser.firebaseKey,
  //       organizationIds: [organizationId],
  //     },
  //     testDataCreator,
  //   )
  //
  //   const response = await request(server)
  //     .get(`${url}/unconfirmed`)
  //     .set(headers)
  //
  //   expect(mockedUser.firstName).toBe(response.body.data[0].firstName)
  //   expect(mockedUser.lastName).toBe(response.body.data[0].lastName)
  //   expect(response.body.data.length).toBeGreaterThanOrEqual(1)
  //   response.body.data.forEach(row => expect(row.status).toBe('NEW'))
  //   expect(response.status).toBe(200)
  //   done()
  // })

  // test('Migrate User / (GET)', async done => {
  //   const unconfirmedResponse = await request(server)
  //     .get(`${url}/unconfirmed`)
  //     .set(headers)
  //
  //   const response = await request(server)
  //     .post(`${url}/migrate`)
  //     .set(headers)
  //     .send({
  //       migrations: [
  //         {
  //           notConfirmedPatientId: unconfirmedResponse.body.data[0].idPatient,
  //           action: 'NEW',
  //         },
  //       ],
  //     })
  //
  //   expect(response.status).toBe(201)
  //
  //   done()
  // })

  afterAll(async () => {
    await Promise.all([
      deleteUserByIdTestDataCreator(userId, testDataCreator),
      // deleteUserByEmail(userCreatePayload.email),
      // deleteUserByEmailTestDataCreator(userCreatePayload.email),
      deleteOrganization(organizationId),
      deleteOrganization(newOrganizationId),
      // patientTestUtility.findAndRemoveProfile({firstName: userCreatePayload.firstName}),
      // patientTestUtility.findAndRemoveProfile({firstName: dependantCreatePayload.firstName}),
      patientTestUtility.findAndRemoveProfile({firstName: userMockName}),
    ])
    // await patientTestUtility.patientRepository.delete({firstName: userCreatePayload.firstName})
    // await patientTestUtility.patientRepository.delete({firstName: dependantCreatePayload.firstName})
    // await patientTestUtility.patientRepository.delete({firstName: userMockName})
    await app.close()
  })
})
