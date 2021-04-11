import request from 'supertest'

import {app as server} from '../../../src/app'

jest.mock('../../../../common/src/middlewares/authorization')

import {createPulseOxygen, deleteAllPulseOxygenByUserId} from '../../__seeds__/pulse-oxygen'
import {createUser, deleteUserByIdTestDataCreator} from '../../__seeds__/user'

const testDataCreator = __filename.split('/packages/')[1]
const organizationId = 'TEST1'
const headers = {
  accept: 'application/json',
  'Content-Type': 'application/json',
  Authorization: 'Bearer RegUser',
  organizationid: organizationId,
}
const userId = 'USER1'

describe('listTestResults', () => {
  beforeAll(async () => {
    await createUser({id: userId, organizationIds: [organizationId]}, testDataCreator)
    await createPulseOxygen('PulseOxygen1', userId, organizationId, testDataCreator)
    await createPulseOxygen('PulseOxygen2', userId, organizationId, testDataCreator)
  })

  test('should return all test results', async (done) => {
    const url = `/reservation/api/v1/test-results`
    const result = await request(server.app).get(url).set(headers)
    expect(result.status).toBe(200)
    done()
  })

  afterAll(async () => {
    await deleteAllPulseOxygenByUserId(userId, testDataCreator)
    await deleteUserByIdTestDataCreator(userId, testDataCreator)
  })
})
