import request from 'supertest'

import {app as server} from '../../../../src/app'
import {createAppointment, deleteAppointmentByDateTime} from '../../../__seeds__/appointments'
jest.mock('../../../../../common/src/middlewares/authorization')

const dateForAppointments = '2020-02-05'
const dateTimeForAppointment1 = `${dateForAppointments}T07:00:00`

describe('AdminAppointmentController', () => {
  beforeAll(async () => {
    await createAppointment({
      dateTime: dateTimeForAppointment1,
      dateOfAppointment: 'February 05, 2020',
    })
    await createAppointment({
      dateTime: dateTimeForAppointment1,
      dateOfAppointment: 'February 05, 2020',
    })
    await createAppointment({
      dateTime: `2020-02-01T07:00:00`,
      dateOfAppointment: 'February 01, 2020',
    })
  })

  describe('get appointment list', () => {
    test('get appointments by date of appointment successfully.', async (done) => {
      const url = `/reservation/admin/api/v1/appointments?dateOfAppointment=${dateForAppointments}`
      const result = await request(server.app).get(url).set('authorization', 'bearer 10000')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBe(2)
      done()
    })
  })

  afterAll(async () => {
    await deleteAppointmentByDateTime(`${dateForAppointments}T23:59:59`) //End of Day
  })
})
