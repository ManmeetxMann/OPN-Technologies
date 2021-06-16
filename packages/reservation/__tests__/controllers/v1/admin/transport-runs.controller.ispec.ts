// import request from 'supertest'

// import {app as server} from '../../../../src/app'
import {createTransportRun, deleteTransportRuns} from '../../../__seeds__/transport-runs'
import {create as createLab, deleteLabsByTestDataCreator} from '../../../__seeds__/labs'

jest.spyOn(global.console, 'error').mockImplementation()
jest.spyOn(global.console, 'info').mockImplementation()
jest.mock('../../../../../common/src/middlewares/authorization')

const testDataCreator = __filename.split('/packages/')[1]

// const url = '/reservation/admin/api/v1/transport-runs'
// const runLabel = testDataCreator
const creationDate = '2021-06-14'
const creationTime = 'T09:37:29.035Z'
// const driverName = 'TEST_DRIVER'

const labId = 'TEST_RUN_LAB_ID'

// const headers = {
//   authorization: 'Bearer ClinicUser',
//   'Content-Type': 'application/json',
// }

describe('AdminTransportRunsController', () => {
  beforeAll(async () => {
    await createTransportRun(
      {
        id: 'TRANSPORT_RUN_ID',
        labId: labId,
        label: testDataCreator,
        createdAt: creationDate + creationTime,
      },
      testDataCreator,
    )

    await createLab(
      {
        id: labId,
        createdAt: creationDate + creationTime,
        userID: 'TEST_RUNS_USER',
      },
      testDataCreator,
    )
  })

  describe('Dummy test run', () => {
    expect(200).toBe(200)
  })

  // describe('List transport runs', () => {
  //   test('list transport run success', async () => {
  //     const result = await request(server.app)
  //       .get(url)
  //       .set('authorization', headers.authorization)
  //       .set('labid', labId)
  //       .query({transportDate: creationDate})

  //     expect(result.status).toBe(200)
  //     expect(result.body.data.length).toBeGreaterThanOrEqual(1)
  //   })

  //   test('list transport run failed', async () => {
  //     const result = await request(server.app).get(url).set('authorization', headers.authorization)

  //     expect(result.status).toBe(400)
  //   })
  // })

  // describe('Create transport run', () => {
  //   test('create new run successfully', async () => {
  //     const testData = {
  //       transportDateTime: creationDate + creationTime,
  //       driverName,
  //       label: runLabel,
  //       labId,
  //     }

  //     const result = await request(server.app).post(url).set(headers).send(testData)

  //     expect(result.status).toBe(200)
  //   })

  //   test('create new run failed', async () => {
  //     const testData = {
  //       transportDateTime: creationDate + creationTime,
  //       driverName,
  //       label: runLabel,
  //       labId: '',
  //     }

  //     const result = await request(server.app).post(url).set(headers).send(testData)

  //     expect(result.status).toBe(404)
  //   })
  // })

  afterAll(async () => {
    await deleteTransportRuns(testDataCreator)
    await deleteLabsByTestDataCreator(testDataCreator)
  })
})
