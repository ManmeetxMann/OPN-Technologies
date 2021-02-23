import request from 'supertest'

import {app as server} from '../../../../src/app'
import {createPCRTestResult, deletePCRTestResultByDateTime} from '../../../__seeds__/pcr-test-results'
jest.mock('../../../../../common/src/middlewares/authorization')

const dateForAppointments = '2020-02-05'
const dateTimeForAppointment7AM = `${dateForAppointments}T07:00:00`
const deadlineSameDay = `${dateForAppointments}T23:59:00`

const organizationId = 'TEST1'

describe('PCRTestResultController', () => {
  beforeAll(async () => {
    await createPCRTestResult({
      dateTime: dateTimeForAppointment7AM,
      deadline: deadlineSameDay
    })
    await createPCRTestResult({
      dateTime: dateTimeForAppointment7AM,
      organizationId: organizationId,
      deadline: deadlineSameDay
    })
  })

  describe('get result list', () => {
    test('get results for lab successfully.', async (done) => {
      const url = `/reservation/admin/api/v1/pcr-test-results?deadline=${dateForAppointments}`
      const result = await request(server.app).get(url).set('authorization', 'Bearer LabUser')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBe(2)
      done()
    })

    test('get results for non lab successfully.', async (done) => {
      const url = `/reservation/admin/api/v1/pcr-test-results?deadline=${dateForAppointments}&organizationId=${organizationId}`
      const result = await request(server.app).get(url).set('authorization', 'Bearer CorporateUserForTEST1')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBe(1)
      done()
    })
  })

  afterAll(async () => {
    await deletePCRTestResultByDateTime(`${dateForAppointments}T23:59:59`) //End of Day
  })
})
