import {UserHandler} from '../src/handlers'
import {getConnection} from 'typeorm'

describe('Cloud Function: User check', () => {
  test('Cloud Function: User check', async () => {
    await UserHandler.checkUserSyncCoverage()

    expect(200).toBe(200)
  }, 20000)

  test('Cloud Function: Patient check', async () => {
    await UserHandler.checkPatientSyncCoverage()

    expect(200).toBe(200)
  }, 20000)

  afterAll(async () => {
    const connection = getConnection()
    await connection.close()
  })
})
