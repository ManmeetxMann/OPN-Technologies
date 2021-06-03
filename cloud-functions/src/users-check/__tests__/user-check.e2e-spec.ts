import {UserHandler} from '../src/handlers'
import {getConnection} from 'typeorm'

describe('Cloud Function: User check', () => {
  const user = {
    admin: {isOpnSuperAdmin: true},
    authUserId: 'authUserId_000',
    base64Photo: '1',
    email: 'test+test1@stayopn.com',
    firstName: 'developers',
    lastName: 'fhblab1',
    organizationIds: ['TEST1'],
    timestamps: {updatedAt: {_seconds: 1619931339, _nanoseconds: 58000000}},
  }

  test('Check patients', async () => {
    const newUser = Object.assign({}, user)
    newUser.firstName = 'new user'
    await UserHandler.checkUserSyncCoverage()

    expect(200).toBe(200)
  }, 10000)

  // test('Check users', async () => {
  //   const newUser = Object.assign({}, user)
  //   newUser.firstName = 'new user'
  //   await UserHandler.checkPatientSyncCoverage()
  //
  //   expect(200).toBe(200)
  // })

  afterAll(async () => {
    const connection = getConnection()
    await connection.close()
  })
})
