import request from 'supertest'

import {app as server} from '../../../../src/app'
import {createTestRun, deleteTestRuns} from '../../../__seeds__/test-runs'
import {create as createLab, deleteLabsByTestDataCreator} from '../../../__seeds__/labs'

jest.spyOn(global.console, 'error').mockImplementation()
jest.spyOn(global.console, 'info').mockImplementation()
jest.mock('../../../../../common/src/middlewares/authorization')

const url = '/reservation/admin/api/v1/test-runs'
const testRunName = 'TEST_RUN_TEST_RECORD'
const creationDate = '2021-06-14'
const creationTime = 'T09:37:29.035Z'

const testDataCreator = __filename.split('/packages/')[1]

const headers = {
  authorization: 'Bearer ClinicUser',
  'Content-Type': 'application/json',
}

const labId = 'TEST_RUNS_LAB'

describe('AdminTestRunsController', () => {
  beforeAll(async () => {
    await createTestRun(
      {
        id: 'testRun_id',
        name: testRunName,
        createdAt: creationDate + creationTime,
      },
      testDataCreator,
    )

    await createLab(
      {
        id: labId,
        createdAt: creationDate + creationTime,
        userID: 'TEST_RUN_USER',
      },
      testDataCreator,
    )
  })

  describe('post test run', () => {
    test('post test run successfully', async () => {
      const successTestData = {
        testRunDateTime: creationDate + creationTime,
        name: testRunName,
        labId: labId,
      }

      const result = await request(server.app).post(url).set(headers).send(successTestData)

      expect(result.status).toBe(200)
      expect(result.body.data).toHaveProperty('testRunId')
    })

    test('post test run failure', async () => {
      const failureTestData = {
        testRunDateTime: creationTime,
        name: testRunName,
        labId: '',
      }

      const result = await request(server.app).post(url).set(headers).send(failureTestData)

      expect(result.status).toBe(400)
    })
  })

  describe('get test runs', () => {
    test('get test runs successfully', async () => {
      const result = await request(server.app)
        .get(url)
        .set('labid', labId)
        .set('authorization', 'Bearer 10000')
        .query({testRunDate: creationDate})

      expect(result.status).toBe(200)
      expect(result.body.data.length).toBeGreaterThanOrEqual(1)
    })

    test('get test runs failure', async () => {
      const result = await request(server.app).get(url).set('authorization', 'Bearer 10000')
      expect(result.status).toBe(400)
    })
  })

  afterAll(async () => {
    await deleteTestRuns(testRunName)
    await deleteLabsByTestDataCreator(testDataCreator)
  })
})
