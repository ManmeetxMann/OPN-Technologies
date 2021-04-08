import request from 'supertest'

import {app as server} from '../../../../src/app'
import {create, deleteAppointmentByTestDataCreator} from '../../../__seeds__/appointments'
import {deleteAll} from '../../../__seeds__/admin-scan-history'
import {
  createPCRTestResult,
  deletePCRTestResultByTestDataCreator,
} from '../../../__seeds__/pcr-test-results'

//jest.spyOn(global.console, 'error').mockImplementation()
jest.spyOn(global.console, 'info').mockImplementation()
jest.mock('../../../../../common/src/middlewares/authorization')
jest.mock('../../../../../common/src/utils/logging-setup')
jest.mock('../../../../../common/src/service/google/pub_sub')

const testDataCreator = __filename.split('/packages/')[1]
const dateForAppointments = '2020-03-05'
const dateTimeForAppointment1 = `${dateForAppointments}T07:00:00`
const deadlineSameDay = `${dateForAppointments}T23:59:00`
const aptID1 = 'APT10'
const organizationId = 'TEST1'
describe('AdminScanHistoryController', () => {
  beforeAll(async () => {
    await deletePCRTestResultByTestDataCreator(testDataCreator)
    await deleteAppointmentByTestDataCreator(testDataCreator)
    await create(
      {
        id: aptID1,
        dateTime: dateTimeForAppointment1,
        dateOfAppointment: 'February 05, 2020',
        appointmentStatus: 'InTransit',
        organizationId,
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
      const url = `/reservation/admin/api/v1/rapid-antigen-test-results`
      const result = await request(server.app)
        .post(url)
        .set('authorization', 'bearer 10000')
        .set('Content-Type', 'application/json')
        .send([
          {
            appointmentID: 'BAD_ID',
            action: 'DoNothing',
            sendAgain: true,
          },
          {
            appointmentID: aptID1,
            action: 'SendPositive', // DoNothing, SendInconclusive, SendNegative, SendPositive
          },
        ])

      expect(result.status).toBe(200)
      done()
    })
  })

  afterAll(async () => {
    await deletePCRTestResultByTestDataCreator(testDataCreator)
    await deleteAppointmentByTestDataCreator(testDataCreator)
    deleteAll()
  })
})
