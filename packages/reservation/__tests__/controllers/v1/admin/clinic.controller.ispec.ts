import request from 'supertest'

import {app as server} from '../../../../src/app'
jest.mock('../../../../../common/src/middlewares/authorization')

describe('Clinics controller test', () => {
  const headers = {
    accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: 'Bearer CorporateUserForTEST1',
  }

  test('should create clinic', async () => {
    const url = `/reservation/admin/api/v1/clinics`
    const response = await request(server.app).post(url).set(headers).send({
      name: 'ClinicName',
      address: 'ClinicAdress',
      acuityUser: 'TestUser',
      acuityPass: 'TestPass',
    })

    expect(response.status).toBe(200)
    expect(response.body.data.id.length).toBeGreaterThan(0)
  })

  test('should return list of clinics', async () => {
    const url = `/reservation/admin/api/v1/clinics`
    const response = await request(server.app).get(url).set(headers)

    expect(response.status).toBe(200)
  })
})
