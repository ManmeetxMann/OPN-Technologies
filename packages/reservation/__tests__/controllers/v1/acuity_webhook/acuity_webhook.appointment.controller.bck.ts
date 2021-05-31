import request from 'supertest'
import {app as server} from '../../../../src/app'

//jest.spyOn(global.console, 'error').mockImplementation()
//jest.spyOn(global.console, 'info').mockImplementation()
jest.mock('../../../../src/adapter/acuity.ts')
jest.mock('../../../../src/services/pcr-test-results.service')
jest.mock('../../../../../common/src/middlewares/authorization')
//jest.mock('../../../../../common/src/utils/logging-setup')

describe('AppointmentWebhookController', () => {
  //beforeAll(async () => {})

  describe('Sync Fail because of Bad ID', () => {
    test('get appointments by dateOfAppointment successfully.', async () => {
      const url = `/reservation/acuity_webhook/api/v1/appointment/sync`
      const result = await request(server.app)
        .post(url)
        .set('authorization', 'bearer 10000')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send({
          calendarID: 4571103,
          appointmentTypeID: 17498479,
          id: 100,
          action: 'scheduled',
          returnData: true,
        })
      //Safely Ignored
      expect(result.status).toBe(200)
      expect(result.body.data.state).toBe('InvalidAcuityIDPosted')
    })
  })

  //afterAll(async () => {})
})
