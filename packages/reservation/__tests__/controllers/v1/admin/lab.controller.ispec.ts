import request from 'supertest'

import {app as server} from '../../../../src/app'
import {create, deleteLabsByTestDataCreator} from '../../../__seeds__/labs'

const testDataCreator = __filename.split('/packages/')[1]
jest.spyOn(global.console, 'error').mockImplementation()
jest.spyOn(global.console, 'info').mockImplementation()
jest.mock('../../../../../common/src/middlewares/authorization')
jest.mock('../../../../../common/src/utils/logging-setup')

const dateForCreation = '2020-04-05'
const dateTimeForCreation1 = `${dateForCreation}T07:00:00`
const labID1 = 'TEMP1'
describe('AdminLabController', () => {
  beforeAll(async () => {
    await create(
      {
        id: labID1,
        createdAt: dateTimeForCreation1,
        userID: 'USER1',
      },
      testDataCreator,
    )
  })

  describe('get lab list', () => {
    test('get lab list successfully', async () => {
      const url = `/reservation/admin/api/v1/labs`
      const result = await request(server.app).get(url).set('authorization', 'bearer 10000')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('create New Lab', () => {
    test('create new lab successfully', async () => {
      const labName = 'UNIT_TEST_LAB'
      const url = `/reservation/admin/api/v1/labs`
      await request(server.app)
        .post(url)
        .set('authorization', 'bearer 10000')
        .set('Content-Type', 'application/json')
        .send({
          name: labName,
          templateId:'1',
          assay:'TEST'
        })
        .then(async function () {
          const url = `/reservation/admin/api/v1/labs`
          const result = await request(server.app).get(url).set('authorization', 'bearer 10000')
          expect(result.status).toBe(200)
          expect(result.body.data).toEqual(
            expect.arrayContaining([expect.objectContaining({name: labName})]),
          )
        })
    })

    test('should fail to creating label with empty name', async () => {
      const labName = ''
      const url = `/reservation/admin/api/v1/labs`
      const result = await request(server.app)
        .post(url)
        .set('authorization', 'bearer 10000')
        .set('Content-Type', 'application/json')
        .send({
          name: labName,
        })
      expect(result.status).toBe(400)
    })
  })

  afterAll(async () => {
    await deleteLabsByTestDataCreator(testDataCreator)
  })
})
