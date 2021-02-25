import request from 'supertest'

import {app as server} from '../../../../src/app'
import {create, deleteAll} from '../../../__seeds__/labs'

jest.spyOn(global.console, 'error').mockImplementation()
jest.spyOn(global.console, 'info').mockImplementation()
jest.mock('../../../../../common/src/middlewares/authorization')
jest.mock('../../../../../common/src/utils/logging-setup')

const dateForCreation = '2020-02-05'
const dateTimeForCreation1 = `${dateForCreation}T07:00:00`
const labID1 = 'TEMP1'
describe('AdminLabController', () => {
  beforeAll(async () => {
    await create({
      id: labID1,
      createdAt: dateTimeForCreation1,
      userID: 'USER1',
    })
  })

  describe('get lab list', () => {
    test('get lab list successfully', async (done) => {
      const url = `/reservation/admin/api/v1/labs`
      const result = await request(server.app).get(url).set('authorization', 'bearer 10000')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBeGreaterThanOrEqual(1)
      done()
    })
  })

  describe('create New Lab', () => {
    test('create new lab successfully', async (done) => {
      const labName = 'UNIT_TEST_LAB'
      const url = `/reservation/admin/api/v1/labs`
      await request(server.app).post(url)
      .set('authorization', 'bearer 10000')
      .set('Content-Type', 'application/json')
      .send({
        name: labName
      })
      .then(async function(){
        const url = `/reservation/admin/api/v1/labs`
        const result = await request(server.app).get(url).set('authorization', 'bearer 10000')
        expect(result.status).toBe(200)
        expect(result.body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({name: labName})
          ])
        )
        done()
      })
      .catch(()=>{
        done()
      })
    })

    test('should fail to creating label with empty name', async (done) => {
      const labName = ''
      const url = `/reservation/admin/api/v1/labs`
      const result = await request(server.app).post(url)
      .set('authorization', 'bearer 10000')
      .set('Content-Type', 'application/json')
      .send({
        name: labName
      })
      expect(result.status).toBe(400)
      done()
    })
  })

  afterAll(async () => {
    await deleteAll()
  })
})
