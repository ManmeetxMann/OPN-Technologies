import request from 'supertest'

import {app as server} from '../../../../src/app'
import {createAppointment, deleteAppointmentByDateTime} from '../../../__seeds__/appointments'
jest.mock('../../../../../common/src/middlewares/authorization')

const dateForAppointments = '2020-02-05'
const dateTimeForAppointment1 = `${dateForAppointments}T07:00:00`
const organizationId = 'TEST1'

describe('AdminAppointmentController', () => {
  beforeAll(async () => {
    await createAppointment({
      dateTime: dateTimeForAppointment1,
      dateOfAppointment: 'February 05, 2020',
      appointmentStatus: 'InTransit',
    })
    await createAppointment({
      dateTime: dateTimeForAppointment1,
      dateOfAppointment: 'February 05, 2020',
      appointmentStatus: 'InProgress',
    })
    await createAppointment({
      dateTime: dateTimeForAppointment1,
      dateOfAppointment: 'February 05, 2020',
      organizationId: organizationId,
      appointmentStatus: 'InProgress',
    })
    await createAppointment({
      dateTime: dateTimeForAppointment1,
      dateOfAppointment: 'February 05, 2020',
      organizationId: organizationId,
    })
    await createAppointment({
      dateTime: dateTimeForAppointment1,
      dateOfAppointment: 'February 05, 2020',
    })
    await createAppointment({
      dateTime: `2020-02-01T07:00:00`,
      dateOfAppointment: 'February 01, 2020',
    })
    await createAppointment({
      dateTime: `2020-02-01T08:00:00`,
      dateOfAppointment: 'February 01, 2020',
    })
    await createAppointment({
      dateTime: `2020-02-01T08:00:00`,
      dateOfAppointment: 'February 01, 2020',
      appointmentStatus: 'InProgress',
    })
  })

  describe('get appointment list', () => {
    test('get appointments by dateOfAppointment successfully.', async (done) => {
      const url = `/reservation/admin/api/v1/appointments?dateOfAppointment=${dateForAppointments}`
      const result = await request(server.app).get(url).set('authorization', 'bearer 10000')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBe(5)
      done()
    })
    test('get InTransit appointments by dateOfAppointment successfully.', async (done) => {
      const url = `/reservation/admin/api/v1/appointments?dateOfAppointment=${dateForAppointments}&appointmentStatus=InTransit`
      const result = await request(server.app).get(url).set('authorization', 'bearer 10000')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBe(1)
      done()
    })
    test('get appointments by organizationId successfully.', async (done) => {
      const url = `/reservation/admin/api/v1/appointments?organizationId=${organizationId}&dateOfAppointment=${dateForAppointments}`
      const result = await request(server.app).get(url).set('authorization', 'bearer 10000')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBe(2)
      done()
    })
    test('get appointments by no organizationId filter successfully.', async (done) => {
      const url = `/reservation/admin/api/v1/appointments?organizationId=null&dateOfAppointment=${dateForAppointments}`
      const result = await request(server.app).get(url).set('authorization', 'bearer 10000')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBe(3)
      done()
    })
    test('get appointments by organizationId should fail for missing dateOfAppointment', async (done) => {
      const url = `/reservation/admin/api/v1/appointments?organizationId=${organizationId}`
      const result = await request(server.app).get(url).set('authorization', 'bearer 10000')
      expect(result.status).toBe(400)
      done()
    })
    test('get appointments by appointmentStatus should fail for missing dateOfAppointment', async (done) => {
      const url = `/reservation/admin/api/v1/appointments?appointmentStatus=InTransit`
      const result = await request(server.app).get(url).set('authorization', 'bearer 10000')
      expect(result.status).toBe(400)
      done()
    })
  })

  afterAll(async () => {
    await deleteAppointmentByDateTime(`${dateForAppointments}T23:59:59`) //End of Day
  })
})
