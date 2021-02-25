import request from 'supertest'

import {app as server} from '../../../../src/app'
import {create, deleteAppointmentByDateTime} from '../../../__seeds__/appointments'
import {deleteAll} from '../../../__seeds__/admin-scan-history'

//jest.spyOn(global.console, 'error').mockImplementation()
//jest.spyOn(global.console, 'info').mockImplementation()
jest.mock('../../../../../common/src/middlewares/authorization')
jest.mock('../../../../../common/src/utils/logging-setup')

const dateForAppointments = '2020-02-05'
const dateTimeForAppointment1 = `${dateForAppointments}T07:00:00`
const aptID1 = 'APT1'
describe('AdminScanHistoryController', () => {
  beforeAll(async () => {
    await create({
      id: aptID1,
      dateTime: dateTimeForAppointment1,
      dateOfAppointment: 'February 05, 2020',
      appointmentStatus: 'InTransit',
    })
  })
  /*
  describe('get lab list', () => {
    test('get lab list successfully', async (done) => {
      const url = `/reservation/admin/api/v1/labs`
      const result = await request(server.app).get(url).set('authorization', 'bearer 10000')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBeGreaterThanOrEqual(1)
      done()
    })
  })
  */

  describe('create scan history record', () => {
    test('create new scan history record successfully', async (done) => {
      const url = `/reservation/admin/api/v1/admin-scan-history`
      const result = await request(server.app)
        .post(url)
        .set('authorization', 'bearer 10000')
        .set('Content-Type', 'application/json')
        .send({
          barCode: 'BAR1',
          type: 'RapidAntigen',
        })

      expect(result.status).toBe(200)
      expect(result.body.data.id).toBe(aptID1)
      expect(result.body.data.status).toBe('InProgress')
      done()
    })

    test('create new scan history record fails for bad barcode', async (done) => {
      const url = `/reservation/admin/api/v1/admin-scan-history`
      const result = await request(server.app)
        .post(url)
        .set('authorization', 'bearer 10000')
        .set('Content-Type', 'application/json')
        .send({
          barCode: 'BAD_BAR1',
          type: 'RapidAntigen',
        })

      expect(result.status).toBe(404)
      done()
    })

    test('create new scan history record fails for bad type', async (done) => {
      const url = `/reservation/admin/api/v1/admin-scan-history`
      const result = await request(server.app)
        .post(url)
        .set('authorization', 'bearer 10000')
        .set('Content-Type', 'application/json')
        .send({
          barCode: 'BAR1',
          type: 'BAD_TYPE',
        })

      expect(result.status).toBe(400)
      done()
    })
  })


  afterAll(async () => {
    await deleteAppointmentByDateTime(`${dateForAppointments}T23:59:59`) //End of Day
    deleteAll()
  })
})
