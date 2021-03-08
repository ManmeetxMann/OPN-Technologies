import request from 'supertest'

import {app as server} from '../../../../src/app'
jest.mock('../../../../../common/src/middlewares/authorization')

describe('Test Kit Batch controller test', () => {
  const headers = {
    accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: 'Bearer CorporateUserForTEST1',
  }

  test('should create test kit batch', async (done) => {
    const url = `/reservation/admin/api/v1/test-kit-batch`
    const response = await request(server.app).post(url).set(headers).send({
      lotNumber: 'string',
      hardwareName: 'string',
      expiry: '2021-03-01T20:29:46.010Z',
      manufacturer: 'string',
    })

    expect(response.status).toBe(200)
    expect(response.body.data.id.length).toBeGreaterThan(0)
    done()
  })

  test('should return list of test kit batches', async (done) => {
    const url = `/reservation/admin/api/v1/test-kit-batch`
    const response = await request(server.app).get(url).set(headers)

    expect(response.status).toBe(200)
    done()
  })
})