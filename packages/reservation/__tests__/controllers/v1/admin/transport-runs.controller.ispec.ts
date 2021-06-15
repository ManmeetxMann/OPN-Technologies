import request from 'supertest'

import {app as server} from '../../../../src/app'
import {deleteTestRuns, fetchExistingLabId} from '../../../__seeds__/test-runs'

jest.spyOn(global.console, 'error').mockImplementation()
jest.spyOn(global.console, 'info').mockImplementation()
jest.mock('../../../../../common/src/middlewares/authorization')

const url = '/reservation/admin/api/v1/transport-runs'
const runLabel = 'TEST_RUN_LABEL'
const creationDate = '2021-06-14'
const creationTime = 'T09:37:29.035Z'
const driverName = 'TEST_DRIVER'

let labId: string

const headers = {
  authorization: 'Bearer ClinicUser',
  'Content-Type': 'application/json',
}

describe('AdminTransportRunsController', () => {
  beforeAll(async () => {
    labId = await fetchExistingLabId()
  })

  describe('GET', () => {
    test('list transport run success', async () => {
      const result = await request(server.app)
        .get(url)
        .set('authorization', headers.authorization)
        .set('labid', labId)
        .query({transportDate: creationDate})

      expect(result.status).toBe(200)
      expect(result.body.data.length).toBeGreaterThanOrEqual(1)
    })

    test('list transport run failed', async () => {
      const result = await request(server.app).get(url).set('authorization', headers.authorization)

      expect(result.status).toBe(400)
    })
  })

  describe('POST', () => {
    test('create new run successfully', async () => {
      const testData = {
        transportDateTime: creationDate + creationTime,
        driverName,
        label: runLabel,
        labId,
      }

      const result = await request(server.app).post(url).set(headers).send(testData)

      expect(result.status).toBe(200)
    })

    test('create new run failed', async () => {
      const testData = {
        transportDateTime: creationDate + creationTime,
        driverName,
        label: runLabel,
        labId: '',
      }

      const result = await request(server.app).post(url).set(headers).send(testData)

      expect(result.status).toBe(404)
    })
  })

  afterAll(async () => {
    deleteTestRuns(runLabel)
  })
})
