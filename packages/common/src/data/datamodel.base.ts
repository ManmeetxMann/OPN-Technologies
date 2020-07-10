import DataStore from './datastore'
import {HasId, OptionalIdStorable, Storable} from '@firestore-simple/admin/dist/types'

abstract class DataModel<T extends HasId> {
  abstract readonly rootPath: string
  protected abstract readonly zeroSet: Array<Storable<T>>
  private datastore: DataStore

  constructor(datastore: DataStore) {
    this.datastore = datastore
  }

  /**
   * Resets the collection
   */
  reset(): void {
    // Delete all

    // Add all intial values
    for (const record of this.zeroSet) {
      // Create
      this.update(record)
    }
  }

  /**
   * Adds data to the collection
   * @param data Data to add - id does not need to be present.
   */
  async add(data: OptionalIdStorable<T>): Promise<string> {
    const dao = this.datastore.firestoreORM.collection<T>({path: this.rootPath})
    const id = await dao.add(data)
    return id
  }

  /**
   * Updates data in the collection
   * @param data Data to update – id property must be present
   */
  async update(data: Storable<T>): Promise<void> {
    const dao = this.datastore.firestoreORM.collection<T>({path: this.rootPath})
    await dao.set(data)
  }

  /**
   * Increments the given property of the specified document by the count given
   * @param id identifier for the document in the collection
   * @param fieldName field / property name to increment
   * @param byCount how much to increment
   */
  async increment(id: string, fieldName: string, byCount: number): Promise<void> {
    const dao = this.datastore.firestoreORM.collection<T>({path: this.rootPath})
    const obj = {}
    obj['id'] = id
    obj[fieldName] = this.datastore.firestoreAdmin.firestore.FieldValue.increment(byCount)
  }

  /**
   * Gets a document using it's identifier
   * @param id identifier for a document in the collection
   */
  async get(id: string): Promise<T> {
    const dao = this.datastore.firestoreORM.collection<T>({path: this.rootPath})
    const result: T = await dao.fetch(id)
    return result
  }

  async findWhereEqual(property: string, value: any): Promise<T[]> {
    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(property)
    return await this.datastore.firestoreORM
      .collection<T>({path: this.rootPath})
      .where(fieldPath, '==', value)
      .fetch()
  }

  async deleteAll(): Promise<void> {
    const dao = this.datastore.firestoreORM.collection<T>({path: this.rootPath})
    const results = await dao.fetchAll()
    await dao.bulkDelete(results.map((o) => o.id))
  }
}

export default DataModel
