import request from 'supertest'

import {app as server} from '../../../src/app'

jest.mock('../../../../common/src/middlewares/authorization')

import {createPulseOxygen, deleteAllPulseOxygenByUserId} from '../../__seeds__/pulse-oxygen'

const testDataCreator = __filename.slice(__dirname.length + 1, -3)
const headers = {
  accept: 'application/json',
  'Content-Type': 'application/json',
  Authorization: 'Bearer RegUser',
  organizationid: 'TEST1',
}

describe('listTestResults', () => {
  beforeAll(async () => {
    await createPulseOxygen('PulseOxygen1', 'USER1', 'TEST1', testDataCreator)
    await createPulseOxygen('PulseOxygen2', 'USER1', 'TEST1', testDataCreator)
  })

  test('should return all test results', async (done) => {
    const url = `/reservation/api/v1/test-results`
    const result = await request(server.app).get(url).set(headers)
    expect(result.status).toBe(200)
    done()
  })

  afterAll(() => deleteAllPulseOxygenByUserId('USER1', testDataCreator))
})
