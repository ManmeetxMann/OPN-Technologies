import {Test, TestingModule} from '@nestjs/testing'
import {HttpService} from '@nestjs/common'
import * as request from 'supertest'
import {FastifyAdapter, NestFastifyApplication} from '@nestjs/platform-fastify'

import {App} from '../src/main'

const allowedOrigins = ['https://opn-admin-dashboard-dev.nn.r.appspot.com']

describe('Cors settings (e2e)', () => {
  let app: NestFastifyApplication
  let server: HttpService

  beforeAll(async () => {
    const testAppModule: TestingModule = await Test.createTestingModule({
      imports: [App],
    }).compile()

    app = testAppModule.createNestApplication(new FastifyAdapter())

    app.enableCors({
      origin: allowedOrigins,
    })

    server = app.getHttpServer()
    await new Promise(resolve => app.listen(81, resolve))
  })

  afterAll(async () => {
    await app.close()
  })

  test('should return access-control-allow-origin header for legit origin', async done => {
    const url = '/'
    const legitOrigin = 'https://opn-admin-dashboard-dev.nn.r.appspot.com'
    const result = await request(server)
      .options(url)
      .set({
        Origin: legitOrigin,
      })

    expect(result.headers['access-control-allow-origin']).toBe(legitOrigin)
    done()
  })

  test('should restrict access to bad origin: http://example.com', async done => {
    const url = '/'
    const notAllowedOrigin = 'http://example.com'
    const result = await request(server)
      .options(url)
      .withCredentials()
      .set({
        Origin: notAllowedOrigin,
      })

    expect(result.headers['access-control-allow-origin']).toBe('false' || null)
    done()
  })
})
