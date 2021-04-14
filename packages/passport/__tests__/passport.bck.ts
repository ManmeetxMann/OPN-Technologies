import request from 'supertest'
import jestConfig from '../jest.config'
import {app as server} from '../src/app'

jestConfig.mock('../../common/test_utils/firebase-admin')
jestConfig.mock('../../common/test_utils/firestore-simple-admin')

describe('Passport test suite', () => {
  test('Get attestation by ID', async (done) => {
    const attestationId = '123'
    const url = `passport/api/v1/attestation/${attestationId}`
    const headers = {
      authorization: `bearer bearer_token`,
      organizationId: `TEST1`,
    }
    const result = await request(server.app).get(url).set(headers)
    expect(result.status).toBe(200)
    done()
  })
})
