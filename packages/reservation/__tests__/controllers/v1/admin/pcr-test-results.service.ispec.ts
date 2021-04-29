import request from 'supertest'

import {app as server} from '../../../../src/app'
import {
  createPCRTestResult,
  deletePCRTestResultByTestDataCreator,
} from '../../../__seeds__/pcr-test-results'
import {createComment, deleteCommentByTestDataCreator} from '../../../__seeds__/comments'
import {createUser} from '../../../__seeds__/user'

//jest.spyOn(global.console, 'error').mockImplementation()
//jest.spyOn(global.console, 'info').mockImplementation()
jest.mock('../../../../../common/src/middlewares/authorization')
//jest.mock('../../../../../common/src/utils/logging-setup')

const testDataCreator = __filename.split('/packages/')[1]
const dateForAppointments = '2020-01-05'
const dateTimeForAppointment7AM = `${dateForAppointments}T07:00:00`
const deadlineSameDay = `${dateForAppointments}T23:59:00`

const organizationId = 'TEST1'
const labID1 = 'Lab1'
const barCode = 'BAR1'
const pcrTestId = `commentPcrTestId1`
const commentTestId = 'commentTestId1'
const userId = 'USER1'

describe('PCRTestResultController', () => {
  beforeAll(async () => {
    await createUser({id: userId, organizationIds: [organizationId]}, testDataCreator)
    await deletePCRTestResultByTestDataCreator(testDataCreator)
    await createPCRTestResult(
      {
        dateTime: dateTimeForAppointment7AM,
        deadline: deadlineSameDay,
        displayInResult: false,
        testType: 'PCR',
      },
      testDataCreator,
    )
    await createPCRTestResult(
      {
        dateTime: dateTimeForAppointment7AM,
        deadline: deadlineSameDay,
        displayInResult: false,
        testType: 'RapidAntigen',
      },
      testDataCreator,
    )
    await createPCRTestResult(
      {
        dateTime: dateTimeForAppointment7AM,
        deadline: deadlineSameDay,
        labId: labID1,
      },
      testDataCreator,
    )
    await createPCRTestResult(
      {
        dateTime: dateTimeForAppointment7AM,
        deadline: deadlineSameDay,
        labId: labID1,
        id: pcrTestId,
      },
      testDataCreator,
    )
    await createComment({testResultId: pcrTestId, id: commentTestId}, testDataCreator)
    await createPCRTestResult(
      {
        dateTime: dateTimeForAppointment7AM,
        organizationId: organizationId,
        deadline: deadlineSameDay,
      },
      testDataCreator,
    )
    await createPCRTestResult(
      {
        dateTime: dateTimeForAppointment7AM,
        deadline: deadlineSameDay,
        testType: 'PCR',
      },
      testDataCreator,
    )
    await createPCRTestResult(
      {
        dateTime: dateTimeForAppointment7AM,
        organizationId: organizationId,
        deadline: deadlineSameDay,
        testType: 'RapidAntigen',
      },
      testDataCreator,
    )
  })

  describe('get result list', () => {
    test('get results for lab successfully. date filter', async (done) => {
      const url = `/reservation/admin/api/v1/pcr-test-results?date=${dateForAppointments}`
      const result = await request(server.app).get(url).set('authorization', 'Bearer LabUser')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBe(5)
      done()
    })

    test('get results for non lab successfully. date and organizationId filter', async (done) => {
      const url = `/reservation/admin/api/v1/pcr-test-results?date=${dateForAppointments}&organizationId=${organizationId}`
      const result = await request(server.app)
        .get(url)
        .set('authorization', 'Bearer CorporateUserForTEST1')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBe(2)
      done()
    })

    test('get results for lab successfully. date & lab filter', async (done) => {
      const url = `/reservation/admin/api/v1/pcr-test-results?date=${dateForAppointments}`
      const result = await request(server.app)
        .get(url)
        .set('labid', labID1)
        .set('authorization', 'Bearer LabUser')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBe(2)
      done()
    })

    test('get results for non lab successfully. date filter', async (done) => {
      const url = `/reservation/admin/api/v1/pcr-test-results?date=${dateForAppointments}&organizationId=${organizationId}`
      const result = await request(server.app)
        .get(url)
        .set('authorization', 'Bearer CorporateUserForTEST1')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBe(2)
      done()
    })

    test('get results for lab successfully. date & testType filter', async (done) => {
      const url = `/reservation/admin/api/v1/pcr-test-results?date=${dateForAppointments}&testType=PCR`
      const result = await request(server.app)
        .get(url)
        .set('authorization', 'Bearer CorporateUserForTEST1')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBe(4)
      done()
    })

    test('get results for non lab successfully. date & testType:PCR filter', async (done) => {
      const url = `/reservation/admin/api/v1/pcr-test-results?date=${dateForAppointments}&organizationId=${organizationId}&testType=PCR`
      const result = await request(server.app)
        .get(url)
        .set('authorization', 'Bearer CorporateUserForTEST1')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBe(1)
      done()
    })

    test('get results for non lab successfully. date & testType:RapidAntigen filter', async (done) => {
      const url = `/reservation/admin/api/v1/pcr-test-results?date=${dateForAppointments}&organizationId=${organizationId}&testType=RapidAntigen`
      const result = await request(server.app)
        .get(url)
        .set('authorization', 'Bearer CorporateUserForTEST1')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBe(1)
      done()
    })

    test('get result list stats for lab successfully', async (done) => {
      const url = `/reservation/admin/api/v1/pcr-test-results/list/stats?barCode=${barCode}`
      const result = await request(server.app).get(url).set('authorization', 'Bearer LabUser')
      expect(result.status).toBe(200)
      done()
    })

    test('get pcr results due deadline successfully, every result should have waitingResult true', async (done) => {
      const url = `/reservation/admin/api/v1/pcr-test-results/due-deadline?barCode=${barCode}`
      const result = await request(server.app).get(url).set('authorization', 'Bearer LabUser')

      if (result.body.data.length) {
        const everyWaitingResult = result.body.data.every((pcr) => pcr.waitingResult == true)
        expect(everyWaitingResult).toBe(true)
      }

      expect(result.status).toBe(200)
      done()
    })

    test('get pcr results history by barcode successfully', async (done) => {
      const url = `/reservation/admin/api/v1/pcr-test-results/history`
      const result = await request(server.app)
        .post(url)
        .set('authorization', 'Bearer LabUser')
        .send({
          barcode: ['BAR1'],
        })
      expect(result.status).toBe(200)
      done()
    })

    test('comment to pcr results successfully', async (done) => {
      const url = `/reservation/admin/api/v1/test-results/${pcrTestId}/comment`
      const result = await request(server.app)
        .post(url)
        .set('authorization', 'Bearer LabUser')
        .send({
          comment: 'Hi, my testing comment',
          attachmentUrls: ['https://via.placeholder.com/200'],
          internal: false,
        })
      expect(result.status).toBe(200)
      expect(typeof result.body.data.id).toBe('string')
      done()
    })
    test('reply to a comment successfully', async (done) => {
      const url = `/reservation/admin/api/v1/test-results/${pcrTestId}/comment/${commentTestId}/reply`
      const result = await request(server.app)
        .post(url)
        .set('authorization', 'Bearer LabUser')
        .send({
          reply: 'My testing reply comment',
          attachmentUrls: ['https://via.placeholder.com/210'],
        })
      expect(result.status).toBe(200)
      done()
    })
    test('list comments successfully', async (done) => {
      const url = `/reservation/admin/api/v1/test-results/${pcrTestId}/comment`
      const result = await request(server.app)
        .get(url)
        .set('authorization', 'Bearer LabUser')
        .send()
      console.log(result)
      expect(result.status).toBe(200)
      done()
    })
  })

  afterAll(async () => {
    await deletePCRTestResultByTestDataCreator(testDataCreator)
    await deleteCommentByTestDataCreator(pcrTestId)
  })
})
