import request from 'supertest'

import {app as server} from '../../../src/app'

jest.mock('../../../../common/src/middlewares/authorization')

import {createPulseOxygen, deleteAllPulseOxygenByUserId} from '../../__seeds__/pulse-oxygen'
import {createUser, deleteUserByIdTestDataCreator} from '../../__seeds__/user'

const headers = {
  accept: 'application/json',
  Authorization: 'Bearer RegUser',
}

const testDataCreator = __filename.split('/packages/')[1]
const id = 'testPulseOxygen'
const userId = 'USER1'
const organizationId = 'otherOrg'
const organizationIdOther = 'randomOtherOrg'

describe('test getPulseOxygenDetails controller function', () => {
  beforeAll(async () => {
    await deleteUserByIdTestDataCreator(userId, testDataCreator)
    await deleteAllPulseOxygenByUserId(userId, testDataCreator)
    await createUser({id: userId, organizationIds: [organizationId]}, testDataCreator)
    await createPulseOxygen(id, userId, organizationId, testDataCreator)
  })

  test('should return pulse oxygen details', async (done) => {
    const url = `/reservation/api/v1/pulse-oxygen/${id}?organizationId=${organizationId}`
    const result = await request(server.app).get(url).set(headers)

    expect(result.status).toBe(200)
    done()
  })

  test('should return not authorised for other organization user', async (done) => {
    const url = `/reservation/api/v1/pulse-oxygen/${id}?organizationId=${organizationIdOther}`
    const result = await request(server.app).get(url).set(headers)

    expect(result.status).toBe(400)
    done()
  })

  afterAll(async () => {
    await deleteAllPulseOxygenByUserId(userId, testDataCreator)
    await deleteUserByIdTestDataCreator(userId, testDataCreator)
  })
})
