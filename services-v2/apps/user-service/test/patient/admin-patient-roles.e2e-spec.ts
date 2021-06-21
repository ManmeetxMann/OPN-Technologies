import {Test, TestingModule} from '@nestjs/testing'
import {HttpService} from '@nestjs/common'
import {FastifyAdapter, NestFastifyApplication} from '@nestjs/platform-fastify'

import * as request from 'supertest'
import {App} from '../../src/main'
import {AuthGlobalGuard} from '@opn-services/common'
import {ExecutionContext} from '@nestjs/common'
import {commonHeaders} from '@opn-services/test/utils'

jest.mock('@opn-services/common/services/firebase/firebase-auth.service')
jest.setTimeout(10000)

describe('AdminPatientController roles test with mocked AuthGlobalGuard: Patients Admin (e2e)', () => {
  const url = '/admin/api/v1/patients'
  let app: NestFastifyApplication
  let server: HttpService

  const userId = 'PATIENT_BASIC'
  const headers = {
    accept: 'application/json',
    authorization: `Bearer userId:${userId}`,
  }

  beforeAll(async () => {
    const testAppModule: TestingModule = await Test.createTestingModule({
      imports: [App],
    })
      .overrideProvider(AuthGlobalGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest()
          req.raw.locals = {
            authUser: {
              authUserId: 'AuthUserId',
              admin: {
                isLabUser: false,
                isTestKitBatchAdmin: true,
                isPatientsAdmin: true,
              },
            },
          }
          return true
        },
      })
      .compile()

    app = testAppModule.createNestApplication(new FastifyAdapter())
    server = app.getHttpServer()
    await new Promise(resolve => app.listen(81, resolve))
  })

  test('should allow access to patients with PatientsAdmin', async done => {
    const response = await request(server)
      .get(url)
      .set({
        ...headers,
        ...commonHeaders,
      })
    expect(response.status).toBe(200)
    done()
  })

  afterAll(async () => {
    await app.close()
  })
})

describe('AdminPatientController roles test with mocked AuthGlobalGuard: OpnSuperAdmin (e2e)', () => {
  const url = '/admin/api/v1/patients'
  let app: NestFastifyApplication
  let server: HttpService

  const userId = 'PATIENT_BASIC'
  const headers = {
    accept: 'application/json',
    authorization: `Bearer userId:${userId}`,
  }

  beforeAll(async () => {
    const testAppModule: TestingModule = await Test.createTestingModule({
      imports: [App],
    })
      .overrideProvider(AuthGlobalGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest()
          req.raw.locals = {
            authUser: {
              authUserId: 'AuthUserId',
              admin: {
                isOpnSuperAdmin: true,
              },
            },
          }
          return true
        },
      })
      .compile()

    app = testAppModule.createNestApplication(new FastifyAdapter())

    server = app.getHttpServer()
    await new Promise(resolve => app.listen(81, resolve))
  })

  test('should allow access to patients with OpnSuperAdmin admin', async done => {
    const response = await request(server)
      .get(url)
      .set({
        ...headers,
        ...commonHeaders,
      })

    expect(response.status).toBe(200)
    done()
  })

  afterAll(async () => {
    await app.close()
  })
})

describe('AdminPatientController roles test with mocked AuthGlobalGuard: Lab User with Org and Lab ID (e2e)', () => {
  const url = '/admin/api/v1/patients'
  let app: NestFastifyApplication
  let server: HttpService

  const userId = 'PATIENT_BASIC'
  const headers = {
    accept: 'application/json',
    authorization: `Bearer userId:${userId}`,
  }

  beforeAll(async () => {
    const testAppModule: TestingModule = await Test.createTestingModule({
      imports: [App],
    })
      .overrideProvider(AuthGlobalGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest()
          req.raw.locals = {
            authUser: {
              authUserId: 'AuthUserId',
              admin: {
                isLabUser: true,
              },
              organizationIds: ['TEST_ORG_ID'],
              requestOrganizationId: 'OTHER_ORG_ID',
              requestLabId: 'LAB_ID',
            },
          }
          return true
        },
      })
      .compile()

    app = testAppModule.createNestApplication(new FastifyAdapter())

    server = app.getHttpServer()
    await new Promise(resolve => app.listen(81, resolve))
  })

  test('should forbid access to patients with lab user with wrong org', async done => {
    const response = await request(server)
      .get(url)
      .set({
        ...headers,
        ...commonHeaders,
      })

    expect(response.status).toBe(403)
    done()
  })

  afterAll(async () => {
    await app.close()
  })
})
