import DataStore from '../src/data/datastore'
import {RegistrationModel, RegistrationTypes} from '../../registry/src/models/registration'
import {Platforms} from '../src/types/platform'

describe('registration tests', () => {
  test('registration > init', () => {
    // Create DataStore
    const datastore = new DataStore()

    // Create
    const registration = new RegistrationModel(datastore)
  })

  test('registration > reset', async () => {
    // Create DataStore
    const datastore = new DataStore()

    // Create Identifier
    const registration = new RegistrationModel(datastore)

    // Test reset
    registration.reset()
  })

  test('registration > add', async () => {
    // Create DataStore
    const datastore = new DataStore()

    // Create
    const registration = new RegistrationModel(datastore)

    // Add
    const id1 = await registration.add({
      type: RegistrationTypes.User,
      pushToken: 'S1234567898765431',
      platform: Platforms.IOS,
      osVersion: '13',
    })
    const id2 = await registration.add({
      type: RegistrationTypes.Admin,
      pushToken: 'S1234567898765432',
      platform: Platforms.Android,
      osVersion: '9_SDK_28',
    })
  })
})
