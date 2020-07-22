import DataStore from './datastore'
import {HasId, OptionalIdStorable, Storable} from '@firestore-simple/admin/dist/types'
import {firestore} from 'firebase-admin'

abstract class DataModel<T extends HasId> {
  abstract readonly rootPath: string
  protected abstract zeroSet: Array<Storable<T>>
  private datastore: DataStore
  readonly ready: Promise<unknown>

  constructor(datastore: DataStore, zeroSet: Array<Storable<T>> = []) {
    this.datastore = datastore
    this.ready = this.initialize(zeroSet)
  }

  /**
   * Resets the collection
   */
  private initialize(zeroSet: Array<Storable<T>>): Promise<unknown> {
    // Add all intial values
    return Promise.all(
      zeroSet.map(
        async (record): Promise<void> => {
          const currentDocument = await this.datastore.firestoreAdmin
            .firestore()
            .collection(this.rootPath)
            .doc(record.id)
            .get()
          if (currentDocument.exists) {
            console.log(`Initializing even though document ${record.id} already exists`)
          } else {
            await this.datastore.firestoreORM
              .collection<T>({path: this.rootPath})
              .set(record)
          }
        },
      ),
    )
  }

  /**
   * Adds data to the collection
   * @param data Data to add - id does not need to be present.
   */
  async add(data: OptionalIdStorable<T>): Promise<T> {
    await this.ready
    return this.datastore.firestoreORM
      .collection<T>({path: this.rootPath})
      .addOrSet(data)
      .then((id) => this.get(id))
  }

  async addAll(data: Array<OptionalIdStorable<T>>): Promise<T[]> {
    await this.ready
    return this.datastore.firestoreORM
      .collection<T>({path: this.rootPath})
      .bulkAdd(data)
      .then(() => this.fetchAll())
  }

  async fetchAll(): Promise<T[]> {
    await this.ready
    return this.datastore.firestoreORM
      .collection<T>({path: this.rootPath})
      .fetchAll()
  }

  /**
   * Updates data in the collection
   * @param data Data to update – id property must be present
   */
  async update(data: Storable<T>): Promise<T> {
    await this.ready
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
    await this.ready
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
    await this.ready
    return this.datastore.firestoreAdmin
      .firestore()
      .collection(this.rootPath)
      .doc(id)
      .update({
        [fieldName]: firestore.FieldValue.increment(byCount),
      })
      .then(() => this.get(id))
  }

  /**
   * Gets a document using it's identifier
   * @param id identifier for a document in the collection
   */
  async get(id: string): Promise<T> {
    await this.ready
    const dao = this.datastore.firestoreORM.collection<T>({path: this.rootPath})
    const result: T = await dao.fetch(id)
    return result
  }

  async findWhereEqual(property: string, value: unknown): Promise<T[]> {
    await this.ready
    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(property)
    return await this.datastore.firestoreORM
      .collection<T>({path: this.rootPath})
      .where(fieldPath, '==', value)
      .fetch()
  }

  async findWhereMapHasKeyValueEqual(map: string, key: string, value: unknown): Promise<T[]> {
    await this.ready
    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(map, key)
    return await this.datastore.firestoreORM
      .collection<T>({path: this.rootPath})
      .where(fieldPath, '==', value)
      .fetch()
  }

  async deleteAll(): Promise<void> {
    await this.ready
    const dao = this.datastore.firestoreORM.collection<T>({path: this.rootPath})
    const results = await dao.fetchAll()
    await dao.bulkDelete(results.map((o) => o.id))
  }
}

export default DataModel
