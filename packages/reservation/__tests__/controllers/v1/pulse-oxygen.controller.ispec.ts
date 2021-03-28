import request from 'supertest'

import {app as server} from '../../../src/app'

jest.mock('../../../../common/src/middlewares/authorization')

import {createPulseOxygen, deleteAllPulseOxygenByUserId} from '../../__seeds__/pulse-oxygen'

const headers = {
  accept: 'application/json',
  'Content-Type': 'application/json',
  Authorization: 'Bearer RegUser',
}

const id = 'test'
const userId = 'USER1'
const organizationId = 'TEST1'

describe('test getPulseOxygenDetails controller function', () => {
  beforeAll(async () => await createPulseOxygen(id, userId, organizationId))

  test('should return pulse oxygen details', async (done) => {
    const url = `/reservation/api/v1/pulse-oxygen/${id}?organizationId=${organizationId}`
    const result = await request(server.app).get(url).set(headers)

    expect(result.status).toBe(200)
    done()
  })

  test('should return not authorised for other organization user', async (done) => {
    const url = `/reservation/api/v1/pulse-oxygen/${id}?organizationId=otherOrg`
    const result = await request(server.app).get(url).set(headers)

    expect(result.status).toBe(400)
    done()
  })

  afterAll(() => deleteAllPulseOxygenByUserId(userId))
})
