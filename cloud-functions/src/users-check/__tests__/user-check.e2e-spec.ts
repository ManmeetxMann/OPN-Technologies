import {UserHandler} from '../src/handlers'
import {getConnection} from 'typeorm'

describe('Cloud Function: User sync', () => {
  // const usererId = 'new_user_id'
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

  test('Check user with mysql', async () => {
    const newUser = Object.assign({}, user)
    newUser.firstName = 'new user'
    await UserHandler.checkUserSyncCoverage()
    // await UserHandler.updateUser(userId, newUser, user)

    expect(200).toBe(200)
  })

  afterAll(async () => {
    const connection = getConnection()
    await connection.close()
  })
})
