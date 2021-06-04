import {UserHandler} from '../src/handlers'
import {getConnection} from 'typeorm'

describe('Cloud Function: User check', () => {
  test('Check patients', async () => {
    await UserHandler.checkUserSyncCoverage()

    expect(200).toBe(200)
  }, 10000)

  test('Cloud Function: Patient check', async () => {
    await UserHandler.checkPatientSyncCoverage()

    expect(200).toBe(200)
  }, 10000)

  afterAll(async () => {
    const connection = getConnection()
    await connection.close()
  })
})
