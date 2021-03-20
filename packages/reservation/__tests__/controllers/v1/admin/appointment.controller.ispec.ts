import request from 'supertest'

import {app as server} from '../../../../src/app'
import {create, deleteAppointmentByDateTime} from '../../../__seeds__/appointments'

jest.spyOn(global.console, 'error').mockImplementation()
jest.spyOn(global.console, 'info').mockImplementation()
jest.mock('../../../../../common/src/middlewares/authorization')
jest.mock('../../../../../common/src/utils/logging-setup')

const dateForAppointments = '2020-02-05'
const dateTimeForAppointment1 = `${dateForAppointments}T07:00:00`
const organizationId = 'TEST1'
const laboratoryId = 'Lab1'
describe('AdminAppointmentController', () => {
  beforeAll(async () => {
    await create({
      id: 'APT1',
      dateTime: dateTimeForAppointment1,
      dateOfAppointment: 'February 05, 2020',
      appointmentStatus: 'InTransit',
      labId: laboratoryId,
    })
    await create({
      id: 'APT2',
      dateTime: dateTimeForAppointment1,
      dateOfAppointment: 'February 05, 2020',
      appointmentStatus: 'InProgress',
      labId: laboratoryId,
    })
    await create({
      id: 'APT3',
      dateTime: dateTimeForAppointment1,
      dateOfAppointment: 'February 05, 2020',
      organizationId: organizationId,
      appointmentStatus: 'InProgress',
      labId: laboratoryId,
    })
    await create({
      id: 'APT4',
      dateTime: dateTimeForAppointment1,
      dateOfAppointment: 'February 05, 2020',
      organizationId: organizationId,
    })
    await create({
      id: 'APT5',
      dateTime: dateTimeForAppointment1,
      dateOfAppointment: 'February 05, 2020',
    })
    await create({
      id: 'APT6',
      dateTime: `2020-02-01T07:00:00`,
      dateOfAppointment: 'February 01, 2020',
    })
    await create({
      id: 'APT7',
      dateTime: `2020-02-01T08:00:00`,
      dateOfAppointment: 'February 01, 2020',
    })
    await create({
      id: 'APT8',
      dateTime: `2020-02-01T08:00:00`,
      dateOfAppointment: 'February 01, 2020',
      appointmentStatus: 'InProgress',
    })
  })

  describe('get appointment list', () => {
    test('get appointments by dateOfAppointment successfully.', async (done) => {
      const url = `/reservation/admin/api/v1/appointments?dateOfAppointment=${dateForAppointments}`
      const result = await request(server.app).get(url).set('authorization', 'Bearer LabUser')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBe(5)
      done()
    })
    test('get appointments by dateOfAppointment and Lab successfully.', async (done) => {
      const url = `/reservation/admin/api/v1/appointments?dateOfAppointment=${dateForAppointments}&labId=${laboratoryId}`
      const result = await request(server.app).get(url).set('authorization', 'Bearer LabUser')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBe(3)
      done()
    })
    test('get InTransit appointments by dateOfAppointment successfully.', async (done) => {
      const url = `/reservation/admin/api/v1/appointments?dateOfAppointment=${dateForAppointments}&appointmentStatus=InTransit`
      const result = await request(server.app).get(url).set('authorization', 'Bearer LabUser')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBe(1)
      done()
    })
    test('get appointments by organizationId successfully.', async (done) => {
      const url = `/reservation/admin/api/v1/appointments?organizationId=${organizationId}&dateOfAppointment=${dateForAppointments}`
      const result = await request(server.app).get(url).set('authorization', 'Bearer LabUser')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBe(2)
      done()
    })
    test('get appointments by no organizationId filter successfully.', async (done) => {
      const url = `/reservation/admin/api/v1/appointments?organizationId=null&dateOfAppointment=${dateForAppointments}`
      const result = await request(server.app).get(url).set('authorization', 'Bearer LabUser')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBe(3)
      done()
    })
    test('get appointments by organizationId should fail for missing dateOfAppointment', async (done) => {
      const url = `/reservation/admin/api/v1/appointments?organizationId=${organizationId}`
      const result = await request(server.app).get(url).set('authorization', 'Bearer LabUser')
      expect(result.status).toBe(400)
      done()
    })
    test('get appointments by appointmentStatus should fail for missing dateOfAppointment', async (done) => {
      const url = `/reservation/admin/api/v1/appointments?appointmentStatus=InTransit`
      const result = await request(server.app).get(url).set('authorization', 'Bearer LabUser')
      expect(result.status).toBe(400)
      done()
    })
  })

  describe('get appointment list stats', () => {
    test('get appointments stats by dateOfAppointment and Lab successfully.', async (done) => {
      const url = `/reservation/admin/api/v1/appointments/list/stats?dateOfAppointment=${dateForAppointments}&labId=${laboratoryId}`
      const result = await request(server.app).get(url).set('authorization', 'Bearer LabUser')
      expect(result.status).toBe(200)
      expect(result.body.data.total).toBe(3)
      done()
    })
  })

  describe('get appointment types', () => {
    test('get acuity appointment types list', async (done) => {
      const url = `/reservation/admin/api/v1/appointments/acuity/types`
      const result = await request(server.app).get(url).set('authorization', 'Bearer LabUser')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBeGreaterThanOrEqual(1)
      done()
    })
  })

  afterAll(async () => {
    await deleteAppointmentByDateTime(`${dateForAppointments}T23:59:59`) //End of Day
  })
})
