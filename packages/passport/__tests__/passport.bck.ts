import request from 'supertest'
import {app as server} from '../src/server'

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
