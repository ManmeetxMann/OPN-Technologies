import request from 'supertest'

import {app as server} from '../../../../src/app'
jest.mock('../../../../../common/src/middlewares/authorization')

describe('Test Kit Batch controller test', () => {
  test('should create test kit batch', async (done) => {
    const url = `/reservation/admin/api/v1/test-kit-batch`
    const result = await request(server.app)
      .post(url)
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .set('Authorization', 'Bearer CorporateUserForTEST1')
      .send({
        lotNumber: 'string',
        hardwareName: 'string',
        expiry: '2021-03-01T20:29:46.010Z',
        manufacturer: 'string',
      })
    expect(result.status).toBe(200)
    expect(result.body.data.id.length).toBeGreaterThan(0)
    done()
  })
})
