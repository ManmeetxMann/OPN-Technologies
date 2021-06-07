import request from 'supertest'

import {app as server} from '../../../../src/app'
import {deleteTestDrivers} from '../../../__seeds__/drivers'

const testDataCreator = __filename.split('/packages/')[1]

jest.spyOn(global.console, 'error').mockImplementation()
jest.spyOn(global.console, 'info').mockImplementation()
jest.mock('../../../../../common/src/middlewares/authorization')

describe('AdminDriverController', () => {
  describe('create New Driver', () => {
    test('create new driver successfully', async () => {
      const driverName = 'UNIT_TEST_DRIVER'
      const url = `/reservation/admin/api/v1/drivers`

      await request(server.app)
        .post(url)
        .set('authorization', 'bearer 10000')
        .send({
          name: driverName,
          testDataCreator: testDataCreator
        }).then(async (result) => {
          expect(result.status).toBe(200)
          expect(result.body.data).toHaveProperty('id')
        })
    })

    test('should fail to create with empty name', async () => {
      const driverName = ''
      const url = `/reservation/admin/api/v1/drivers`

      const result = await request(server.app)
        .post(url)
        .set('authorization', 'bearer 10000')
        .set('Content-Type', 'application/json')
        .send({
          name: driverName
        })          

      expect(result.status).toBe(400)
    })
  }),

  describe('get driver list', () => {
    test('get driver list successfully', async() => {
      const url = `/reservation/admin/api/v1/drivers`
      const result = await request(server.app).get(url).set('authorization', 'beared 10000')

      expect(result.status).toBe(200)
      expect(result.body.data.length).toBeGreaterThanOrEqual(1)
    })
  }),


  describe('update existing driver', () => {
    test('update existing driver successfully', async() => {
      const driverName = 'UNIT_TEST_DRIVER'
      const url = `/reservation/admin/api/v1/drivers`

      await request(server.app)
        .put(url)
        .set('authorization', 'bearer 10000')
        .set('Content-Type', 'application/json')
        .send({
          name: driverName,
          enabled: false
        }).then(async (result) => {
          const getRes = await request(server.app).get(url).set('authorization', 'bearer 10000')
          expect(result.status).toBe(200)
          expect(result.body.data).toHaveProperty('id')
        })
    })


    test('should fail update with empty name', async() => {
      const driverName = ''
      const url = `/reservation/admin/api/v1/drivers`

      const result = await request(server.app)
        .put(url)
        .set('authorization', 'bearer 10000')
        .set('Content-Type', 'application/json')
        .send({
          name: driverName,
          enabled: false
        })

      expect(result.status).toBe(400)
        
    })
  }),

  afterAll(async() => {
    await deleteTestDrivers('UNIT_TEST_DRIVER')
  })
})