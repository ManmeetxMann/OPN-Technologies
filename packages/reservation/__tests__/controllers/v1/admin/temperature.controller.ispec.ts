import request from 'supertest'

import {app as server} from '../../../../src/app'

jest.mock('../../../../../common/src/middlewares/authorization')
jest.mock('../../../../../passport/src/services/attestation-service')

import {deleteAllPulseOxygenByUserId} from '../../../__seeds__/pulse-oxygen'
import {deleteAllTemperatureByUserId} from '../../../__seeds__/temperature'
import {createOrganization, deleteOrgById} from '../../../__seeds__/organization'
import {createUser, deleteUserById} from '../../../__seeds__/user'

const headers = {
  accept: 'application/json',
  'Content-Type': 'application/json',
  Authorization: 'Bearer SuperAdmin',
}

const userId = 'USER1'
const orgIdWithTempCheckEnabled = 'TestOrg1'
const orgIdWithTempDisabled = 'TestOrg2'

describe('Test temperature check request and update passport. Assume user has PROCEED as attestation status', () => {
  beforeAll(async () => {
    await createUser({
      id: userId,
      organizationIds: [orgIdWithTempCheckEnabled, orgIdWithTempDisabled],
    })

    await createOrganization({
      id: orgIdWithTempCheckEnabled,
      name: 'OrgWithTemperatureCheckEnabled',
      enableTemperatureCheck: true,
      userIdToAdd: userId,
    })

    await createOrganization({
      id: 'TestOrg2',
      name: 'OrgWithTemperatureCheckDisabled',
      enableTemperatureCheck: false,
      userIdToAdd: userId,
    })
  })

  test('should add new temperature & update passport status to PROCEED on normal oxygen & temperature', async (done) => {
    const url = '/reservation/admin/api/v1/temperature'
    const result = await request(server.app).post(url).set(headers).send({
      organizationId: orgIdWithTempCheckEnabled,
      temperature: 37,
      pulse: 90,
      oxygen: 97,
      userId,
    })
    console.log({result})
    expect(result.body.data.status).toBe('proceed')
    done()
  })

  test('should add new temperature & update passport status to STOP on LOW (92) oxygen', async (done) => {
    const url = '/reservation/admin/api/v1/temperature'
    const result = await request(server.app).post(url).set(headers).send({
      organizationId: orgIdWithTempCheckEnabled,
      temperature: 38,
      pulse: 90,
      oxygen: 92,
      userId,
    })

    expect(result.body.data.status).toBe('stop')
    done()
  })

  test('should add new temperature & update passport status to STOP on HIGH temperature', async (done) => {
    const url = '/reservation/admin/api/v1/temperature'
    const result = await request(server.app).post(url).set(headers).send({
      organizationId: orgIdWithTempCheckEnabled,
      temperature: 38,
      pulse: 90,
      oxygen: 96,
      userId,
    })

    expect(result.body.data.status).toBe('stop')
    done()
  })

  test('should add new temperature & update passport status to STOP LOW (92) oxygen & HIGH temperature', async (done) => {
    const url = '/reservation/admin/api/v1/temperature'
    const result = await request(server.app).post(url).set(headers).send({
      organizationId: orgIdWithTempCheckEnabled,
      temperature: 38,
      pulse: 90,
      oxygen: 96,
      userId,
    })

    expect(result.body.data.status).toBe('stop')
    done()
  })

  test('should return bad request status: TestOrg2 has disabled temperature check', async (done) => {
    const url = '/reservation/admin/api/v1/temperature'
    const result = await request(server.app).post(url).set(headers).send({
      organizationId: orgIdWithTempDisabled,
      temperature: 38,
      pulse: 90,
      oxygen: 96,
      userId,
    })

    expect(result.status).toBe(400)
    done()
  })

  afterAll(async () => {
    await Promise.all([
      deleteAllPulseOxygenByUserId(userId),
      deleteAllTemperatureByUserId(userId),
      deleteOrgById(orgIdWithTempCheckEnabled),
      deleteOrgById(orgIdWithTempDisabled),
      deleteUserById(userId),
    ])
  })
})
