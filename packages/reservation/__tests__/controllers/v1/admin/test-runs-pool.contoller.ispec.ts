import request from 'supertest'
import {app as server} from '../../../../src/app'

import {deleteTestRunsPoolsByTestRunId} from '../../../__seeds__/test-runs-pool'

jest.spyOn(global.console, 'error').mockImplementation()
jest.spyOn(global.console, 'info').mockImplementation()
jest.mock('../../../../../common/src/middlewares/authorization')

const url = '/reservation/admin/api/v1/test-runs-pools'
const poolCreateTestRunId = 'TEST_RUN_ID_TEST_POOl'
const headers = {
  authorization: 'Bearer LabUser',
  'Content-Type': 'application/json',
}

describe('AdminTestRunsPoolContoller', () => {
  test('should create test runs pool successfully', async () => {
    const response = await request(server.app)
      .post(url)
      .set(headers)
      .send({
        testResultIds: ['A1'],
        testRunId: poolCreateTestRunId,
        well: 'TEST_POOL_WELL',
        numberOfSamples: 5,
      })

    expect(response.status).toBe(200)
  })

  afterAll(async () => {
    await deleteTestRunsPoolsByTestRunId(poolCreateTestRunId)
  })
})
