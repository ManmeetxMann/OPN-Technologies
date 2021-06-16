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

const testDataCreator = __filename.split('/packages/')[1]
const dateForAppointments = '2020-06-05'
const dateForAppointmentStr = 'June 05, 2020'
const dateTimeForAppointment1 = `${dateForAppointments}T07:00:00`
const organizationId = 'TEST1'
const laboratoryId = 'Lab1'
const barCode = 'BAR1'

const transportRunId = 'APPOINTMENT_TRANSPORT_RUN'

describe('AdminAppointmentController', () => {
  beforeAll(async () => {
    await deleteAppointmentByTestDataCreator(testDataCreator)
    await createAppointment(
      {
        id: 'APT1',
        dateTime: dateTimeForAppointment1,
        dateOfAppointment: dateForAppointmentStr,
        appointmentStatus: 'InTransit',
        labId: laboratoryId,
      },
      testDataCreator,
    )
    await createAppointment(
      {
        id: 'APT2',
        dateTime: dateTimeForAppointment1,
        dateOfAppointment: dateForAppointmentStr,
        appointmentStatus: 'InProgress',
        labId: laboratoryId,
      },
      testDataCreator,
    )
    await createAppointment(
      {
        id: 'APT3',
        dateTime: dateTimeForAppointment1,
        dateOfAppointment: dateForAppointmentStr,
        organizationId: organizationId,
        appointmentStatus: 'InProgress',
        labId: laboratoryId,
      },
      testDataCreator,
    )
    await createAppointment(
      {
        id: 'APT4',
        dateTime: dateTimeForAppointment1,
        dateOfAppointment: dateForAppointmentStr,
        organizationId: organizationId,
      },
      testDataCreator,
    )
    await createAppointment(
      {
        id: 'APT5',
        dateTime: dateTimeForAppointment1,
        dateOfAppointment: dateForAppointmentStr,
      },
      testDataCreator,
    )
    await createAppointment(
      {
        id: 'APT6',
        dateTime: `2020-02-01T07:00:00`,
        dateOfAppointment: 'February 01, 2020',
      },
      testDataCreator,
    )
    await createAppointment(
      {
        id: 'APT7',
        dateTime: `2020-02-01T08:00:00`,
        dateOfAppointment: 'February 01, 2020',
      },
      testDataCreator,
    )
    await createAppointment(
      {
        id: 'APT8',
        dateTime: `2020-02-01T08:00:00`,
        dateOfAppointment: 'February 01, 2020',
        appointmentStatus: 'InProgress',
      },
      testDataCreator,
    )

    await createTransportRun(
      {
        id: transportRunId,
        labId: laboratoryId,
        label: testDataCreator,
        createdAt: dateTimeForAppointment1,
      },
      testDataCreator,
    )
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
      expect(result.body.data.length).toBe(3)
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

      expect(result.statusCode).toBe(200)
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

      expect(result.statusCode).toBe(400)
    })
  })

  afterAll(async () => {
    await deleteAppointmentByTestDataCreator(testDataCreator)
    await deleteTransportRuns(testDataCreator)
  })
})
