import request from 'supertest'

import {app as server} from '../../../../src/app'
import {
  createAppointment,
  deleteAppointmentByTestDataCreator,
} from '../../../__seeds__/appointments'
import {deleteAll} from '../../../__seeds__/admin-scan-history'
import {
  createPCRTestResult,
  deletePCRTestResultByTestDataCreator,
} from '../../../__seeds__/pcr-test-results'

jest.spyOn(global.console, 'error').mockImplementation()
jest.spyOn(global.console, 'info').mockImplementation()
jest.mock('../../../../../common/src/middlewares/authorization')
jest.mock('../../../../../common/src/utils/logging-setup')
jest.mock('../../../../../common/src/service/google/pub_sub')

const testDataCreator = __filename.split('/packages/')[1]
const dateForAppointments = '2019-12-05'
const dateForAppointmentStr = 'December 05, 2019'
const dateTimeForAppointment1 = `${dateForAppointments}T07:00:00`
const deadlineSameDay = `${dateForAppointments}T23:59:00`
const aptID1 = 'RapidAPT1'
const organizationId = 'TEST1'
describe('AdminScanHistoryController', () => {
  beforeAll(async () => {
    await deletePCRTestResultByTestDataCreator(testDataCreator)
    await deleteAppointmentByTestDataCreator(testDataCreator)
    await createAppointment(
      {
        id: aptID1,
        dateTime: dateTimeForAppointment1,
        dateOfAppointment: dateForAppointmentStr,
        appointmentStatus: 'InTransit',
        organizationId,
        testType: 'RapidAntigen',
      },
      testDataCreator,
    )
    await createPCRTestResult(
      {
        appointmentId: aptID1,
        dateTime: dateTimeForAppointment1,
        deadline: deadlineSameDay,
      },
      testDataCreator,
    )
  })

  describe('create scan history record', () => {
    test('create new scan history record successfully', async (done) => {
      const url = `/reservation/admin/api/v1/admin-scan-history`
      const result = await request(server.app)
        .post(url)
        .set('authorization', 'Bearer ClinicUser')
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
        .set('authorization', 'Bearer ClinicUser')
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
        .set('authorization', 'Bearer ClinicUser')
        .set('Content-Type', 'application/json')
        .send({
          barCode: 'BAR1',
          type: 'BAD_TYPE',
        })

      expect(result.status).toBe(400)
      done()
    })
  })

  describe('get scan history record', () => {
    test('get new scan history record successfully', async (done) => {
      const url = `/reservation/admin/api/v1/admin-scan-history?type=RapidAntigen`
      const result = await request(server.app)
        .get(url)
        .set('authorization', 'Bearer ClinicUser')
        .set('Content-Type', 'application/json')

      expect(result.status).toBe(200)
      expect(result.body.data).toEqual(
        expect.arrayContaining([expect.objectContaining({id: aptID1})]),
      )
      done()
    })
  })

  afterAll(async () => {
    await deletePCRTestResultByTestDataCreator(testDataCreator)
    await deleteAppointmentByTestDataCreator(testDataCreator)
    deleteAll()
  })
})
