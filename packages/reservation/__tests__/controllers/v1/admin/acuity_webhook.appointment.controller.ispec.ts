import request from 'supertest'
jest.spyOn(global.console, 'error').mockImplementation()
jest.spyOn(global.console, 'info').mockImplementation()

import {app as server} from '../../../../src/app'
jest.mock('../../../../../common/src/middlewares/authorization')

describe('AppointmentWebhookController', () => {
  //beforeAll(async () => {})

  describe('get appointment list', () => {
    test('get appointments by dateOfAppointment successfully.', async (done) => {
      const url = `/reservation/acuity_webhook/api/v1/appointment/create`
      const result = await request(server.app)
        .post(url)
        .set('authorization', 'bearer 10000')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send({
          calendarID: 4571103,
          appointmentTypeID: 17498479,
          id: 506394963,
          action: 'scheduled',
        })
      expect(result.status).toBe(400)
      done()
    })
  })

  //afterAll(async () => {})
})
