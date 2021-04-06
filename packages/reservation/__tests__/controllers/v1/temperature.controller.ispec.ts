import request from 'supertest'
jest.spyOn(global.console, 'error').mockImplementation()
jest.spyOn(global.console, 'info').mockImplementation()

import {app as server} from '../../../src/app'
import {createTemperature, deleteTemperatureByDateTime} from '../../__seeds__/temperature'
jest.mock('../../../../common/src/middlewares/authorization')

const dateForCreation = '2020-02-05'
const dateTimeForCreation1 = `${dateForCreation}T07:00:00`
const temperatureID1 = 'TEMP1'
const temperatureID2 = 'TEMP2'
const organizationID = 'TEST1'
describe('AdminAppointmentController', () => {
  beforeAll(async () => {
    await createTemperature({
      id: temperatureID1,
      createdAt: dateTimeForCreation1,
      organizationID: organizationID,
      userID: 'USER1',
    })
    await createTemperature({
      id: temperatureID2,
      createdAt: dateTimeForCreation1,
      organizationID: organizationID,
      userID: 'USER2',
    })
  })

  const headers = {
    accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: 'Bearer RegUser',
  }

  describe('get appointment list', () => {
    test('get temperature by ID successfully', async (done) => {
      const url = `/reservation/api/v1/temperature/${temperatureID1}?organizationId=${organizationID}`
      const result = await request(server.app).get(url).set(headers)
      expect(result.status).toBe(200)
      expect(result.body.data.temperatureInCelsius).toBe(37.1)
      done()
    })

    test('get temperature by ID failed for wrong ORG', async (done) => {
      const url = `/reservation/api/v1/temperature/${temperatureID1}?organizationId=BAD_ORG`
      const result = await request(server.app).get(url).set(headers)
      expect(result.status).toBe(400)
      done()
    })

    test('get temperature by ID failed for wrong ORG', async (done) => {
      const url = `/reservation/api/v1/temperature/${temperatureID2}?organizationId=${organizationID}`
      const result = await request(server.app).get(url).set(headers)
      expect(result.status).toBe(400)
      done()
    })
  })

  afterAll(async () => {
    await deleteTemperatureByDateTime(`${dateForCreation}T23:59:59`) //End of Day
  })
})
