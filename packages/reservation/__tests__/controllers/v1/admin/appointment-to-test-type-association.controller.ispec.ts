import request from 'supertest'

import {app as server} from '../../../../src/app'
jest.mock('../../../../../common/src/middlewares/authorization')

describe('Appointment to test type association controller test', () => {
  const headers = {
    accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: 'Bearer OPNAdmin',
  }

  test('should create appointment type to test type association', async () => {
    const url = `/reservation/admin/api/v1/appointment-type-to-test-type-assoc`
    const response = await request(server.app).post(url).set(headers).send({
      appointmentType: 0,
      testType: 'PCR',
    })

    expect(response.status).toBe(200)
    expect(response.body.data.id)
  })
})
