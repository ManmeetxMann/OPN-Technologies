import request from 'supertest'

import {app as server} from '../../../../src/app'

jest.mock('../../../../../common/src/middlewares/authorization')
jest.mock('../../../../../passport/src/services/attestation-service')

import {deleteAllPulseOxygenByUserId} from '../../../__seeds__/pulse-oxygen'
import {deleteAllTemperatureByUserId} from '../../../__seeds__/temperature'

const headers = {
  accept: 'application/json',
  'Content-Type': 'application/json',
  Authorization: 'Bearer SuperAdmin',
}

describe('Test temperature check request and update passport. Assume user has PROCEED as attestation status', () => {
  test('should add new temperature & update passport status to PROCEED on normal oxygen & temperature', async (done) => {
    const url = '/reservation/admin/api/v1/temperature'
    const result = await request(server.app).post(url).set(headers).send({
      organizationId: 'TEST1',
      temperature: 37,
      pulse: 90,
      oxygen: 97,
      userId: 'TestUser',
    })

    expect(result.body.data.status).toBe('proceed')
    done()
  })

  test('should add new temperature & update passport status to STOP on LOW (92) oxygen', async (done) => {
    const url = '/reservation/admin/api/v1/temperature'
    const result = await request(server.app).post(url).set(headers).send({
      organizationId: 'TEST1',
      temperature: 38,
      pulse: 90,
      oxygen: 92,
      userId: 'TestUser',
    })

    expect(result.body.data.status).toBe('stop')
    done()
  })

  test('should add new temperature & update passport status to STOP on HIGH temperature', async (done) => {
    const url = '/reservation/admin/api/v1/temperature'
    const result = await request(server.app).post(url).set(headers).send({
      organizationId: 'TEST1',
      temperature: 38,
      pulse: 90,
      oxygen: 96,
      userId: 'TestUser',
    })

    expect(result.body.data.status).toBe('stop')
    done()
  })

  test('should add new temperature & update passport status to STOP LOW (92) oxygen & HIGH temperature', async (done) => {
    const url = '/reservation/admin/api/v1/temperature'
    const result = await request(server.app).post(url).set(headers).send({
      organizationId: 'TEST1',
      temperature: 38,
      pulse: 90,
      oxygen: 96,
      userId: 'TestUser',
    })

    expect(result.body.data.status).toBe('stop')
    done()
  })

  afterAll(() => {
    deleteAllPulseOxygenByUserId('TestUser')
    deleteAllTemperatureByUserId('TestUser')
  })
})
