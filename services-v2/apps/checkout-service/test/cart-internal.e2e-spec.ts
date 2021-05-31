import {Test, TestingModule} from '@nestjs/testing'
import {HttpService} from '@nestjs/common'
import * as request from 'supertest'
import {FastifyAdapter, NestFastifyApplication} from '@nestjs/platform-fastify'

import {App} from '../src/main'

describe('CheckoutInternalController (e2e)', () => {
  const url = `/api/v1/internal/cart`
  let app: NestFastifyApplication
  let server: HttpService

  beforeAll(async () => {
    const testAppModule: TestingModule = await Test.createTestingModule({
      imports: [App],
    }).compile()

    app = testAppModule.createNestApplication(new FastifyAdapter())

    server = app.getHttpServer()
    await new Promise(resolve => app.listen(81, resolve))
  })

  test('sync acuity appointment types', async done => {
    const result = await request(server).post(`${url}/sync-acuity-appointment-types`)

    expect(result.status).toBe(201)
    done()
  })

  test('remove expired items with wrong key', async done => {
    const result = await request(server)
      .post(`${url}/remove-expired-items`)
      .set({
        'opn-scheduler-key': 'TEST_KEY',
      })

    expect(result.status).toBe(403)
    done()
  })

  afterAll(async () => {
    await Promise.all([await app.close()])
  })
})
