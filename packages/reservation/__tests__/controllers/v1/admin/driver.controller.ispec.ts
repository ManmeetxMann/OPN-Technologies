import request from 'supertest'

import {app as server} from '../../../../src/app'
import {deleteTestDrivers} from '../../../__seeds__/drivers'

jest.spyOn(global.console, 'error').mockImplementation()
jest.spyOn(global.console, 'info').mockImplementation()
jest.mock('../../../../../common/src/middlewares/authorization')

const headers = {
  accept: 'application/json',
  'Content-Type': 'application/json',
  Authorization: 'bearer 10000',
}

describe('AdminDriverController', () => {
  describe('create New Driver', () => {
    test('create new driver successfully', async () => {
      const driverName = 'UNIT_TEST_DRIVER'
      const url = `/reservation/admin/api/v1/drivers`

      const result = await request(server.app).post(url).set(headers).send({
        name: driverName,
      })

      expect(result.status).toBe(200)
      expect(result.body.data).toHaveProperty('id')
    })

    test('should fail to create with empty name', async () => {
      const driverName = ''
      const url = `/reservation/admin/api/v1/drivers`

      const result = await request(server.app).post(url).set(headers).send({
        name: driverName,
      })

      expect(result.status).toBe(400)
    })
  }),
    describe('get driver list', () => {
      test('get driver list successfully', async () => {
        const url = `/reservation/admin/api/v1/drivers`
        const result = await request(server.app).get(url).set(headers)

        expect(result.status).toBe(200)
      })
    }),
    describe('update existing driver', () => {
      test('update existing driver successfully', async () => {
        const driverName = 'UNIT_TEST_DRIVER'
        const url = `/reservation/admin/api/v1/drivers`

        const result = await request(server.app).put(url).set(headers).send({
          name: driverName,
          enabled: false,
        })

        expect(result.status).toBe(200)
        expect(result.body.data).toHaveProperty('id')
      })

      test('should fail update with empty name', async () => {
        const driverName = ''
        const url = `/reservation/admin/api/v1/drivers`

        const result = await request(server.app).put(url).set(headers).send({
          name: driverName,
          enabled: false,
        })

        expect(result.status).toBe(400)
      })
    }),
    afterAll(async () => {
      await deleteTestDrivers('UNIT_TEST_DRIVER')
    })
})
