import request from 'supertest'

import {app as server} from '../../../../src/app'
import {
  createAppointment,
  deleteAppointmentByTestDataCreator,
} from '../../../__seeds__/appointments'

import {createTransportRun, deleteTransportRuns} from '../../../__seeds__/transport-runs'

jest.spyOn(global.console, 'error').mockImplementation()
jest.spyOn(global.console, 'info').mockImplementation()
jest.mock('../../../../../common/src/middlewares/authorization')
jest.mock('../../../../../common/src/utils/logging-setup')
jest.mock('../../../../../reservation/src/respository/acuity.repository')

const testDataCreator = __filename.split('/packages/')[1]
const oneDay = 86400000
const dateForAppointments = '2020-06-05'
const dateForAppointmentStr = 'June 05, 2020'
const dateTimeForAppointment1 = `${dateForAppointments}T07:00:00`
const organizationId = 'TEST1'
const laboratoryId = 'Lab1'
const barCode = 'BAR1'
const barCode2 = 'BAR2'
const barCode3 = 'BAR3'
const barCode4 = 'BAR4'

const vialLocation = 'TestLocation'

const transportRunId = 'APPOINTMENT_TRANSPORT_RUN'

jest.setTimeout(15000)

describe('AdminAppointmentController', () => {
  beforeAll(async () => {
    await deleteAppointmentByTestDataCreator(testDataCreator)
    await Promise.all([
      await createAppointment(
        {
          id: 'APT1',
          dateTime: dateTimeForAppointment1,
          dateOfAppointment: dateForAppointmentStr,
          appointmentStatus: 'InTransit',
          labId: laboratoryId,
        },
        testDataCreator,
      ),
      createAppointment(
        {
          id: 'APT2',
          dateTime: dateTimeForAppointment1,
          dateOfAppointment: dateForAppointmentStr,
          appointmentStatus: 'InProgress',
          labId: laboratoryId,
        },
        testDataCreator,
      ),
      createAppointment(
        {
          id: 'APT3',
          dateTime: dateTimeForAppointment1,
          dateOfAppointment: dateForAppointmentStr,
          organizationId: organizationId,
          appointmentStatus: 'InProgress',
          labId: laboratoryId,
        },
        testDataCreator,
      ),
      createAppointment(
        {
          id: 'APT4',
          dateTime: dateTimeForAppointment1,
          dateOfAppointment: dateForAppointmentStr,
          organizationId: organizationId,
        },
        testDataCreator,
      ),
      createAppointment(
        {
          id: 'APT5',
          dateTime: dateTimeForAppointment1,
          dateOfAppointment: dateForAppointmentStr,
        },
        testDataCreator,
      ),
      createAppointment(
        {
          id: 'APT6',
          dateTime: `2020-02-01T07:00:00`,
          dateOfAppointment: 'February 01, 2020',
        },
        testDataCreator,
      ),
      createAppointment(
        {
          id: 'APT7',
          dateTime: `2020-02-01T08:00:00`,
          dateOfAppointment: 'February 01, 2020',
        },
        testDataCreator,
      ),
      createAppointment(
        {
          id: 'APT8',
          dateTime: `2020-02-01T08:00:00`,
          dateOfAppointment: 'February 01, 2020',
          appointmentStatus: 'InProgress',
        },
        testDataCreator,
      ),
      createAppointment(
        {
          id: 'APT9',
          dateTime: `2020-02-01T08:00:00`,
          dateOfAppointment: 'February 01, 2020',
          appointmentStatus: 'InProgress',
          barCode: barCode2,
        },
        testDataCreator,
      ),
      createAppointment(
        {
          id: 'APT10',
          dateTime: `2020-02-01T08:30:00`,
          dateOfAppointment: 'February 01, 2020',
          appointmentStatus: 'Pending',
          barCode: barCode3,
        },
        testDataCreator,
      ),
      createAppointment(
        {
          id: 'APT11',
          dateTime: `2020-02-02T08:30:00`,
          dateOfAppointment: 'February 02, 2020',
          appointmentStatus: 'Pending',
          barCode: barCode4,
        },
        testDataCreator,
      ),
      await createTransportRun(
        {
          id: transportRunId,
          labId: laboratoryId,
          label: testDataCreator,
          createdAt: dateTimeForAppointment1,
          transportDateTime: dateTimeForAppointment1,
          transportDate: dateForAppointments,
        },
        testDataCreator,
      ),
    ])
  })

  describe('get appointment list', () => {
    test('get appointments by dateOfAppointment successfully.', async () => {
      const url = `/reservation/admin/api/v1/appointments?dateOfAppointment=${dateForAppointments}`
      const result = await request(server.app).get(url).set('authorization', 'Bearer LabUser')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBe(5)
    })
    test('get appointments by dateOfAppointment and filtered by PCR testType', async () => {
      const url = `/reservation/admin/api/v1/appointments?dateOfAppointment=${dateForAppointments}&testType=PCR`
      const result = await request(server.app).get(url).set('authorization', 'Bearer LabUser')

      const isFilteredByPcr = result.body.data.every(
        (appoinemtment) => appoinemtment.testType == 'PCR',
      )

      expect(isFilteredByPcr).toBe(true)
      expect(result.status).toBe(200)
    })
    test('get appointments by dateOfAppointment and Lab successfully.', async () => {
      const url = `/reservation/admin/api/v1/appointments?dateOfAppointment=${dateForAppointments}&labId=${laboratoryId}`
      const result = await request(server.app)
        .get(url)
        .set('labid', laboratoryId)
        .set('authorization', 'Bearer LabUser')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBe(3)
    })
    test('get InTransit appointments by dateOfAppointment successfully.', async () => {
      const url = `/reservation/admin/api/v1/appointments?dateOfAppointment=${dateForAppointments}&appointmentStatus=InTransit`
      const result = await request(server.app).get(url).set('authorization', 'Bearer LabUser')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBe(1)
    })
    test('get appointments by organizationId successfully.', async () => {
      const url = `/reservation/admin/api/v1/appointments?organizationId=${organizationId}&dateOfAppointment=${dateForAppointments}`
      const result = await request(server.app).get(url).set('authorization', 'Bearer LabUser')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBe(2)
    })
    test('get appointments by no organizationId filter successfully.', async () => {
      const url = `/reservation/admin/api/v1/appointments?organizationId=null&dateOfAppointment=${dateForAppointments}`
      const result = await request(server.app).get(url).set('authorization', 'Bearer LabUser')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBeGreaterThanOrEqual(3)
    })
    test('get appointments by organizationId should fail for missing dateOfAppointment', async () => {
      const url = `/reservation/admin/api/v1/appointments?organizationId=${organizationId}`
      const result = await request(server.app).get(url).set('authorization', 'Bearer LabUser')
      expect(result.status).toBe(400)
    })
    test('get appointments by appointmentStatus should fail for missing dateOfAppointment', async () => {
      const url = `/reservation/admin/api/v1/appointments?appointmentStatus=InTransit`
      const result = await request(server.app).get(url).set('authorization', 'Bearer LabUser')
      expect(result.status).toBe(400)
    })
  })

  describe('get appointment list stats', () => {
    test('get appointments stats by dateOfAppointment and Lab successfully.', async () => {
      const url = `/reservation/admin/api/v1/appointments/list/stats?dateOfAppointment=${dateForAppointments}`
      const result = await request(server.app)
        .get(url)
        .set('labid', laboratoryId)
        .set('authorization', 'Bearer LabUser')
      expect(result.status).toBe(200)
      expect(result.body.data.total).toBe(3)
    })
  })

  describe('fetch appointments by id', () => {
    test('should get appointment by id: APT1 successfully', async () => {
      const url = `/reservation/admin/api/v1/appointments/APT1`
      const result = await request(server.app).get(url).set('authorization', 'Bearer LabUser')
      expect(result.status).toBe(200)
      expect(result.body.data.id).toBe('APT1')
    })
    test('should get appointment history by id: APT1 successfully', async () => {
      const url = `/reservation/admin/api/v1/appointments/APT1/history`
      const result = await request(server.app).get(url).set('authorization', 'Bearer LabUser')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBeGreaterThan(1)
    })
  })

  describe('appointment barcodes', () => {
    test('should get appointment by barCode', async () => {
      const url = `/reservation/admin/api/v1/appointments/barcode/lookup?barCode=${barCode}`
      const result = await request(server.app).get(url).set('authorization', 'Bearer LabUser')
      expect(result.status).toBe(200)
      expect(result.body.data.id).toBeTruthy()
    })
    test('should generate new barcode', async () => {
      const url = `/reservation/admin/api/v1/appointments/barcode/get-new-code`
      const result = await request(server.app).get(url).set('authorization', 'Bearer LabUser')
      expect(result.status).toBe(200)
    })
  })

  describe('get appointment types', () => {
    test('get acuity appointment types list', async () => {
      const url = `/reservation/admin/api/v1/appointments/acuity/types`
      const result = await request(server.app).get(url).set('authorization', 'Bearer LabUser')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Appointment add label', () => {
    test('add label to appointment', async () => {
      const url = `/reservation/admin/api/v2/appointments/add-labels`
      const result = await request(server.app)
        .put(url)
        .set('Content-Type', 'application/json')
        .set('authorization', 'Bearer LabUser')
        .send({
          appointmentIds: ['APT9'],
          label: 'SameDay',
        })

      const resultAfter = await request(server.app)
        .put(url)
        .set('Content-Type', 'application/json')
        .set('authorization', 'Bearer LabUser')
        .send({
          appointmentIds: ['APT9'],
          label: 'NextDay',
        })

      expect(result.body.data.length).toBeGreaterThanOrEqual(1)
      expect(
        new Date(resultAfter.body.data[0].updatedData.deadline).getTime() -
        new Date(result.body.data[0].updatedData.deadline).getTime(),
      ).toBe(oneDay)
      expect(result.status).toBe(200)
    })
  })

  describe('Appointment vial location', () => {
    test('add vialLocation to appointment', async () => {
      const url = `/reservation/admin/api/v1/appointments/receive`
      const result = await request(server.app)
        .put(url)
        .set('Content-Type', 'application/json')
        .set('authorization', 'Bearer LabUser')
        .send({
          appointmentIds: ['APT9'],
          vialLocation,
        })

      expect(result.status).toBe(200)
      expect(result.body.data.length).toBeGreaterThanOrEqual(1)
      expect(result.body.data[0].updatedData.vialLocation).toBe(vialLocation)
    })
  })

  describe('Appointment check-in', () => {
    test('check-in appointment', async () => {
      const url = `/reservation/admin/api/v1/appointments/${'APT10'}/check-in`
      const result = await request(server.app)
        .put(url)
        .set('Content-Type', 'application/json')
        .set('authorization', 'Bearer LabUser')

      expect(result.status).toBe(200)
      expect(result.body.data.status).toBe('CheckedIn')
    })
  })

  describe('Appointment cancel', () => {
    test('cancel appointment', async () => {
      const url = `/reservation/admin/api/v1/appointments/${'APT11'}/cancel`
      const result = await request(server.app)
        .put(url)
        .set('Content-Type', 'application/json')
        .set('authorization', 'Bearer LabUser')

      expect(result.status).toBe(200)
    })
  })

  describe('add transport run', () => {
    test('add transport run successfully', async () => {
      const appointments = ['APT1', 'APT2']

      const url = '/reservation/admin/api/v1/appointments/add-transport-run'
      const result = await request(server.app)
        .put(url)
        .set('Content-Type', 'application/json')
        .set('authorization', 'Bearer LabUser')
        .send({
          appointmentIds: appointments,
          transportRunId,
        })

      expect(result.status).toBe(200)
    })

    test('add transport run failed', async () => {
      const appointments = ['APT1', 'APT2']

      const url = '/reservation/admin/api/v1/appointments/add-transport-run'
      const result = await request(server.app)
        .put(url)
        .set('Content-Type', 'application/json')
        .set('authorization', 'Bearer LabUser')
        .send({
          appointmentIds: appointments,
        })

      expect(result.status).toBe(400)
    })
  })

  afterAll(async () => {
    await deleteAppointmentByTestDataCreator(testDataCreator)
    await deleteTransportRuns(testDataCreator)
  })
})
