import request from 'supertest'

import {app as server} from '../../../../src/app'

jest.spyOn(global.console, 'error').mockImplementation()
jest.spyOn(global.console, 'info').mockImplementation()
jest.mock('../../../../../common/src/middlewares/authorization')
jest.mock('../../../../../common/src/adapters/passport')
jest.mock('../../../../../passport/src/services/attestation-service')

import {deleteAllPulseOxygenByUserId} from '../../../__seeds__/pulse-oxygen'
import {deleteAllTemperatureByUserId} from '../../../__seeds__/temperature'
import {createOrganization, deleteOrgById} from '../../../__seeds__/organization'
import {createUser, deleteUserByIdTestDataCreator} from '../../../__seeds__/user'

// Mock internal calls to always return success
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fetch = require('node-fetch')
jest.mock('node-fetch')
fetch.mockResolvedValue({
  ok: true,
  json: () => ({}),
})

const testDataCreator = __filename.split('/packages/')[1]
const headers = {
  accept: 'application/json',
  'Content-Type': 'application/json',
  Authorization: 'Bearer SuperAdmin',
}

const userId = 'USER_TEMPERATURE_1'
const orgIdWithTempCheckEnabled = 'TestOrg1'
const orgIdWithTempDisabled = 'TestOrg2'

describe('Test temperature check request and update passport. Assume user has PROCEED as attestation status', () => {
  beforeAll(async () => {
    await createUser(
      {
        id: userId,
        organizationIds: [orgIdWithTempCheckEnabled, orgIdWithTempDisabled],
      },
      testDataCreator,
    )

    await createOrganization(
      {
        id: orgIdWithTempCheckEnabled,
        name: 'OrgWithTemperatureCheckEnabled',
        enableTemperatureCheck: true,
        userIdToAdd: userId,
      },
      testDataCreator,
    )

    await createOrganization(
      {
        id: orgIdWithTempDisabled,
        name: 'OrgWithTemperatureCheckDisabled',
        enableTemperatureCheck: false,
        userIdToAdd: userId,
      },
      testDataCreator,
    )

    /**
     * Some test are failing after 5 seconds without response
     * TODO:
     * 1. Investigate why some calls taking long to process and optimize a logic
     */
    jest.setTimeout(7500)
  })

  test('should add new temperature & update passport status to PROCEED on normal oxygen & temperature', async () => {
    const url = '/reservation/admin/api/v1/temperature'
    const result = await request(server.app).post(url).set(headers).send({
      organizationId: orgIdWithTempCheckEnabled,
      temperature: 37,
      pulse: 90,
      oxygen: 97,
      userId,
    })

    expect(result.body.data.status).toBe('proceed')
  })

  test('should add new temperature & update passport status to STOP on LOW (92) oxygen', async () => {
    const url = '/reservation/admin/api/v1/temperature'
    const result = await request(server.app).post(url).set(headers).send({
      organizationId: orgIdWithTempCheckEnabled,
      temperature: 38,
      pulse: 90,
      oxygen: 92,
      userId,
    })

    expect(result.body.data.status).toBe('stop')
  })

  test('should add new temperature & update passport status to STOP on HIGH temperature', async () => {
    const url = '/reservation/admin/api/v1/temperature'
    const result = await request(server.app).post(url).set(headers).send({
      organizationId: orgIdWithTempCheckEnabled,
      temperature: 38,
      pulse: 90,
      oxygen: 96,
      userId,
    })

    expect(result.body.data.status).toBe('stop')
  })

  test('should add new temperature & update passport status to STOP LOW (92) oxygen & HIGH temperature', async () => {
    const url = '/reservation/admin/api/v1/temperature'
    const result = await request(server.app).post(url).set(headers).send({
      organizationId: orgIdWithTempCheckEnabled,
      temperature: 38,
      pulse: 90,
      oxygen: 96,
      userId,
    })

    expect(result.body.data.status).toBe('stop')
  })

  test('should return bad request status: TestOrg2 has disabled temperature check', async () => {
    const url = '/reservation/admin/api/v1/temperature'
    const result = await request(server.app).post(url).set(headers).send({
      organizationId: orgIdWithTempDisabled,
      temperature: 38,
      pulse: 90,
      oxygen: 96,
      userId,
    })

    expect(result.status).toBe(400)
  })

  afterAll(async () => {
    await Promise.all([
      deleteAllPulseOxygenByUserId(userId, testDataCreator),
      deleteAllTemperatureByUserId(userId, testDataCreator),
      deleteOrgById(orgIdWithTempCheckEnabled, testDataCreator),
      deleteOrgById(orgIdWithTempDisabled, testDataCreator),
      deleteUserByIdTestDataCreator(userId, testDataCreator),
    ])
  })
})
