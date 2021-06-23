import request from 'supertest'

import {app as server} from '../../../../src/app'
import {
  createPCRTestResult,
  deletePCRTestResultByTestDataCreator,
} from '../../../__seeds__/pcr-test-results'
import {createComment, deleteCommentByTestDataCreator} from '../../../__seeds__/comments'
import {createUser} from '../../../__seeds__/user'
import {deleteTestRunsByDataCreator} from '../../../__seeds__/test-runs'

//jest.spyOn(global.console, 'error').mockImplementation()
//jest.spyOn(global.console, 'info').mockImplementation()
//jest.mock('../../../../../common/src/utils/logging-setup')
jest.mock('../../../../../common/src/middlewares/authorization')

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

const testRunId = 'PCR_TEST_RUN_ID'

describe('PCRTestResultController', () => {
  beforeAll(async () => {
    await deletePCRTestResultByTestDataCreator(testDataCreator)
    await Promise.all([
      createUser({id: userId, organizationIds: [organizationId]}, testDataCreator),
      createPCRTestResult(
        {
          dateTime: dateTimeForAppointment7AM,
          deadline: deadlineSameDay,
          displayInResult: false,
          testType: 'PCR',
        },
        testDataCreator,
      ),
      createPCRTestResult(
        {
          dateTime: dateTimeForAppointment7AM,
          deadline: deadlineSameDay,
          displayInResult: false,
          testType: 'RapidAntigen',
        },
        testDataCreator,
      ),
      createPCRTestResult(
        {
          dateTime: dateTimeForAppointment7AM,
          deadline: deadlineSameDay,
          labId: labID1,
        },
        testDataCreator,
      ),
      createPCRTestResult(
        {
          dateTime: dateTimeForAppointment7AM,
          deadline: deadlineSameDay,
          labId: labID1,
          id: pcrTestId,
        },
        testDataCreator,
      ),
      createComment({testResultId: pcrTestId, id: commentTestId}, testDataCreator),
      createPCRTestResult(
        {
          dateTime: dateTimeForAppointment7AM,
          organizationId: organizationId,
          deadline: deadlineSameDay,
        },
        testDataCreator,
      ),
      createPCRTestResult(
        {
          dateTime: dateTimeForAppointment7AM,
          deadline: deadlineSameDay,
          testType: 'PCR',
        },
        testDataCreator,
      ),
      createPCRTestResult(
        {
          dateTime: dateTimeForAppointment7AM,
          organizationId: organizationId,
          deadline: deadlineSameDay,
          testType: 'RapidAntigen',
        },
        testDataCreator,
      ),
    ])
  })

  describe('get result list', () => {
    test('get results for lab successfully. date filter', async () => {
      const url = `/reservation/admin/api/v1/pcr-test-results?date=${dateForAppointments}`
      const result = await request(server.app).get(url).set('authorization', 'Bearer LabUser')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBeGreaterThan(0)
    })

    test('get results for non lab successfully. date and organizationId filter', async () => {
      const url = `/reservation/admin/api/v1/pcr-test-results?date=${dateForAppointments}&organizationId=${organizationId}`
      const result = await request(server.app)
        .get(url)
        .set('authorization', 'Bearer CorporateUserForTEST1')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBeGreaterThan(0)
    })

    test('get results for lab successfully. date & lab filter', async () => {
      const url = `/reservation/admin/api/v1/pcr-test-results?date=${dateForAppointments}`
      const result = await request(server.app)
        .get(url)
        .set('labid', labID1)
        .set('authorization', 'Bearer LabUser')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBeGreaterThan(0)
    })

    test('get results for non lab successfully. date filter', async () => {
      const url = `/reservation/admin/api/v1/pcr-test-results?date=${dateForAppointments}&organizationId=${organizationId}`
      const result = await request(server.app)
        .get(url)
        .set('authorization', 'Bearer CorporateUserForTEST1')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBeGreaterThan(0)
    })

    test('get results for lab successfully. date & testType filter', async () => {
      const url = `/reservation/admin/api/v1/pcr-test-results?date=${dateForAppointments}&testType=PCR`
      const result = await request(server.app)
        .get(url)
        .set('authorization', 'Bearer CorporateUserForTEST1')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBeGreaterThan(0)
    })

    test('get results for non lab successfully. date & testType:PCR filter', async () => {
      const url = `/reservation/admin/api/v1/pcr-test-results?date=${dateForAppointments}&organizationId=${organizationId}&testType=PCR`
      const result = await request(server.app)
        .get(url)
        .set('authorization', 'Bearer CorporateUserForTEST1')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBeGreaterThan(0)
    })

    test('get results for non lab successfully. date & testType:RapidAntigen filter', async () => {
      const url = `/reservation/admin/api/v1/pcr-test-results?date=${dateForAppointments}&organizationId=${organizationId}&testType=RapidAntigen`
      const result = await request(server.app)
        .get(url)
        .set('authorization', 'Bearer CorporateUserForTEST1')
      expect(result.status).toBe(200)
      expect(result.body.data.length).toBeGreaterThan(0)
    })

    test('get result list stats for lab successfully', async () => {
      const url = `/reservation/admin/api/v1/pcr-test-results/list/stats?barCode=${barCode}`
      const result = await request(server.app).get(url).set('authorization', 'Bearer LabUser')
      expect(result.status).toBe(200)
    })

    test('get pcr results due deadline successfully, every result should have waitingResult true', async () => {
      const url = `/reservation/admin/api/v1/pcr-test-results/due-deadline?barCode=${barCode}`
      const result = await request(server.app).get(url).set('authorization', 'Bearer LabUser')

      if (result.body.data.length) {
        const everyWaitingResult = result.body.data.every((pcr) => pcr.waitingResult == true)
        expect(everyWaitingResult).toBe(true)
      }

      expect(result.status).toBe(200)
    })

    test('get pcr results history by barcode successfully', async () => {
      const url = `/reservation/admin/api/v1/pcr-test-results/history`
      const result = await request(server.app)
        .post(url)
        .set('authorization', 'Bearer LabUser')
        .send({
          barcode: ['BAR1'],
        })
      expect(result.status).toBe(200)
    })

    test('comment to pcr results successfully', async () => {
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
    })
    test('reply to a comment successfully', async () => {
      const url = `/reservation/admin/api/v1/test-results/${pcrTestId}/comment/${commentTestId}/reply`
      const result = await request(server.app)
        .post(url)
        .set('authorization', 'Bearer LabUser')
        .send({
          reply: 'My testing reply comment',
          attachmentUrls: ['https://via.placeholder.com/210'],
        })
      expect(result.status).toBe(200)
    })
    test('list comments successfully', async () => {
      const url = `/reservation/admin/api/v1/test-results/${pcrTestId}/comment`
      const result = await request(server.app)
        .get(url)
        .set('authorization', 'Bearer LabUser')
        .send()
      expect(result.status).toBe(200)
    })
  })

  describe('add test run', () => {
    test('add test run successfully', async () => {
      const url = '/reservation/admin/api/v1/pcr-test-results/add-test-run'
      const pcrTestResultIds = [pcrTestId]

      const result = await request(server.app)
        .put(url)
        .set('Content-Type', 'application/json')
        .set('authorization', 'Bearer LabUser')
        .send({
          pcrTestResultIds,
          testRunId,
        })

      expect(result.status).toBe(200)
    })

    test('add test run failed', async () => {
      const url = '/reservation/admin/api/v1/pcr-test-results/add-test-run'
      const pcrTestResultIds = [pcrTestId]

      const result = await request(server.app)
        .put(url)
        .set('Content-Type', 'application/json')
        .set('authorization', 'Bearer LabUser')
        .send({
          pcrTestResultIds,
          testRunId: 'inexistent_run_id',
        })

      expect(result.status).toBe(404)
    })
  })

  afterAll(async () => {
    await deletePCRTestResultByTestDataCreator(testDataCreator)
    await deleteCommentByTestDataCreator(pcrTestId)
    await deleteTestRunsByDataCreator(testDataCreator)
  })
})
