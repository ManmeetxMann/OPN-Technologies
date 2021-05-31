import {Test, TestingModule} from '@nestjs/testing'
import {HttpService} from '@nestjs/common'
import {FastifyAdapter, NestFastifyApplication} from '@nestjs/platform-fastify'

import * as request from 'supertest'
import {App} from '../src/main'
import {AuthGlobalGuard} from '@opn-services/common'
import {ExecutionContext} from '@nestjs/common'
import {commonHeaders} from '@opn-services/test/utils'

jest.mock('@opn-services/common/services/firebase/firebase-auth.service')
jest.setTimeout(10000)

describe('Authorization Guard roles for cart: Basic user without org (e2e)', () => {
  const url = '/api/v1/cart'
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
              admin: null,
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

  test('should forbid access to cart without Org - Organization ID not provided`', async done => {
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

describe('Authorization Guard roles for cart with mocked AuthGlobalGuard: Basic user with other org (e2e)', () => {
  const url = '/api/v1/cart'
  let app: NestFastifyApplication
  let server: HttpService

  const userId = 'PATIENT_BASIC'
  const headers = {
    accept: 'application/json',
    authorization: `Bearer userId:${userId}`,
  }
  const userOrgId = 'ROLES_TEST_ORG_ID'

  beforeAll(async () => {
    const testAppModule: TestingModule = await Test.createTestingModule({
      imports: [App],
    })
      .overrideProvider(AuthGlobalGuard)
      .useValue({
        // mock guard so we can pass desired values
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest()
          req.raw.locals = {
            authUser: {
              authUserId: 'AuthUserId',
              admin: {
                superAdminForOrganizationIds: [userOrgId],
              },
              organizationIds: [userOrgId],
              requestOrganizationId: 'ORG_ID',
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

  test('should forbid access to cart for user with other Org', async done => {
    const response = await request(server)
      .get(url)
      .set({
        ...headers,
        ...commonHeaders,
        organizationid: userOrgId,
      })

    expect(response.status).toBe(403)
    done()
  })

  afterAll(async () => {
    await app.close()
  })
})

describe('Authorization Guard roles for cart with mocked AuthGlobalGuard: Super Admin auth without org (e2e)', () => {
  const url = '/api/v1/cart'
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
        // mock guard so we can pass desired values
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest()
          req.raw.locals = {
            authUser: {
              authUserId: 'AuthUserId',
              admin: {
                isOpnSuperAdmin: true,
              },
              organizationIds: [],
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

  test('should allow access to cart with OpnSuperAdmin wihout org', async done => {
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
