import request from 'supertest'

import {app as server} from '../../../src/app'
import {createAppointment, deleteAppointmentByTestDataCreator} from '../../__seeds__/appointments'
import {
  createPCRTestResult,
  deletePCRTestResultByTestDataCreator,
} from '../../__seeds__/pcr-test-results'

jest.mock('../../../../common/src/middlewares/authorization')

import {createPulseOxygen, deleteAllPulseOxygenByUserId} from '../../__seeds__/pulse-oxygen'
import {createUser, deleteUserByIdTestDataCreator} from '../../__seeds__/user'

const testDataCreator = __filename.split('/packages/')[1]
const organizationId = 'TEST1'
const headers = {
  accept: 'application/json',
  'Content-Type': 'application/json',
  Authorization: 'Bearer RegUser',
  organizationid: organizationId,
}
const userId = 'USER1'
const aptID1 = 'APT10'
const aptID2 = 'APT2'
const dateForAppointments = '2020-01-05'
const dateTimeForAppointment7AM = `${dateForAppointments}T07:00:00`
const deadlineSameDay = `${dateForAppointments}T23:59:00`

describe('listTestResults', () => {
  beforeAll(async () => {
    await createUser({id: userId, organizationIds: [organizationId]}, testDataCreator)
    await createPulseOxygen('PulseOxygen1', userId, organizationId, testDataCreator)
    await createPulseOxygen('PulseOxygen2', userId, organizationId, testDataCreator)
    await createPCRTestResult(
      {
        dateTime: dateTimeForAppointment7AM,
        deadline: deadlineSameDay,
        testType: 'PCR',
        userId: userId,
        organizationId,
      },
      testDataCreator,
    )
    await createAppointment(
      {
        id: aptID1,
        dateTime: dateTimeForAppointment7AM,
        dateOfAppointment: 'February 05, 2020',
        appointmentStatus: 'InTransit',
        userId: userId,
        organizationId,
      },
      testDataCreator,
    )
    await createPCRTestResult(
      {
        appointmentId: aptID1,
        appointmentStatus: 'InTransit',
        firstName: 'app1',
        dateTime: dateTimeForAppointment7AM,
        deadline: deadlineSameDay,
        userId: userId,
        organizationId,
      },
      testDataCreator,
    )
    await createAppointment(
      {
        id: aptID2,
        dateTime: dateTimeForAppointment7AM,
        dateOfAppointment: 'February 05, 2020',
        appointmentStatus: 'Reported',
        userId: userId,
        organizationId,
      },
      testDataCreator,
    )
    await createPCRTestResult(
      {
        appointmentId: aptID2,
        appointmentStatus: 'Reported',
        firstName: 'app2',
        dateTime: dateTimeForAppointment7AM,
        deadline: deadlineSameDay,
        result: 'Negative',
        userId: userId,
        organizationId,
      },
      testDataCreator,
    )
  })

  test('should return all test results', async () => {
    const url = `/reservation/api/v1/test-results`
    const result = await request(server.app).get(url).set(headers)
    expect(result.status).toBe(200)
    expect(result.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          result: 'Negative',
          detailsAvailable: true,
        }),
        expect.objectContaining({
          result: 'In Progress',
          detailsAvailable: false,
        }),
      ]),
    )
  })

  afterAll(async () => {
    await deletePCRTestResultByTestDataCreator(testDataCreator)
    await deleteAppointmentByTestDataCreator(testDataCreator)
    await deleteAllPulseOxygenByUserId(userId, testDataCreator)
    await deleteUserByIdTestDataCreator(userId, testDataCreator)
  })
})
