import DataStore from './datastore'
import {HasId, OptionalIdStorable, Storable} from '@firestore-simple/admin/dist/types'
import {firestore} from 'firebase-admin'

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
  async add(data: OptionalIdStorable<T>): Promise<T> {
    return this.datastore.firestoreORM
      .collection<T>({path: this.rootPath})
      .addOrSet(data)
      .then((id) => this.get(id))
  }

  async addAll(data: Array<OptionalIdStorable<T>>): Promise<T[]> {
    return this.datastore.firestoreORM
      .collection<T>({path: this.rootPath})
      .bulkAdd(data)
      .then(() => this.fetchAll())
  }

  async fetchAll(): Promise<T[]> {
    return this.datastore.firestoreORM
      .collection<T>({path: this.rootPath})
      .fetchAll()
  }

  /**
   * Updates data in the collection
   * @param data Data to update – id property must be present
   */
  async update(data: Storable<T>): Promise<T> {
    return this.datastore.firestoreORM
      .collection<T>({path: this.rootPath})
      .set(data)
      .then((id) => this.get(id))
  }

  /**
   * Updates one field in a document
   * @param id identifier for the document in the collection
   * @param fieldName field / property name to update
   * @param fieldValue field / property value to update
   */
  async updateProperty(id: string, fieldName: string, fieldValue: unknown): Promise<T> {
    return this.get(id).then((data) =>
      this.update({
        ...data,
        [fieldName]: fieldValue,
      } as Storable<T>),
    )
  }

  /**
   * Increments the given property of the specified document by the count given
   * @param id identifier for the document in the collection
   * @param fieldName field / property name to increment
   * @param byCount how much to increment
   */
  async increment(id: string, fieldName: string, byCount: number): Promise<T> {
    return this.datastore.firestoreAdmin
      .firestore()
      .collection(this.rootPath)
      .doc(id)
      .update({
        [fieldName]: firestore.FieldValue.increment(byCount),
      })
      .then((_) => this.get(id))
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

  async findWhereEqual(property: string, value: unknown): Promise<T[]> {
    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(property)
    return await this.datastore.firestoreORM
      .collection<T>({path: this.rootPath})
      .where(fieldPath, '==', value)
      .fetch()
  }

  async findWhereMapHasKeyValueEqual(map: string, key: string, value: unknown): Promise<T[]> {
    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(map, key)
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
