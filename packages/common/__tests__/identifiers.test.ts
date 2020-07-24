import DataStore from '../src/data/datastore'
import {IdentifiersModel} from '../src/data/identifiers'

describe('identifier tests', () => {
  test.skip('identifier > initialization', async () => {
    // Create DataStore
    const datastore = new DataStore()
    const identifier = new IdentifiersModel(datastore)

    expect((await identifier.get('status')).count).toEqual(10000)
    expect((await identifier.get('access')).count).toEqual(10000)
    expect((await identifier.get('attestation')).count).toEqual(10000)
  })

  test('identifier > increment', async () => {
    // Create DataStore
    const datastore = new DataStore()

    // Create Identifier
    const identifier = new IdentifiersModel(datastore)

    // Getting Value
    const id = await identifier.getUniqueValue('status')

    // Test
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(5)
  })
})
