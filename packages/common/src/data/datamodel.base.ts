import DataStore from './datastore'
import {HasId, OptionalIdStorable, Storable} from '@firestore-simple/admin/dist/types'
import {firestore} from 'firebase-admin'
import {Collection} from '@firestore-simple/admin'

abstract class DataModel<T extends HasId> {
  abstract readonly rootPath: string
  protected abstract readonly zeroSet: Array<Storable<T>>
  private datastore: DataStore

  constructor(datastore: DataStore) {
    this.datastore = datastore
  }

  /**
   * Get the document at the given path
   * @param subPath the path, after rootpath, to the collection
   */
  private doc(id: string, subPath = ''): firestore.DocumentReference {
    const path = subPath ? `${this.rootPath}/${subPath}` : this.rootPath
    return this.datastore.firestoreAdmin.firestore().collection(path).doc(id)
  }

  /**
   * Get a reference to a collection (NOT a CollectionReference) at the given path
   * @param subPath the path, after rootpath, to the collection
   */
  private getDAO(subPath = ''): Collection<T> {
    const path = subPath ? `${this.rootPath}/${subPath}` : this.rootPath
    return this.datastore.firestoreORM.collection<T>({path})
  }

  /**
   * Resets the collection
   */
  public initialize(): Promise<unknown> {
    // Add all intial values
    return Promise.all(
      this.zeroSet.map(
        async (record): Promise<void> => {
          const currentDocument = await this.doc(record.id).get()
          if (currentDocument.exists) {
            console.log(`${record.id} already exists, skipping initialization`)
          } else {
            console.log(`initializing ${record.id}`)
            await this.update(record)
          }
        },
      ),
    )
  }

  /**
   * Adds data to the collection
   * @param data Data to add - id does not need to be present.
   * @param subPath path to the subcollection where we add data. rootPath if left blank
   */
  async add(data: OptionalIdStorable<T>, subPath = ''): Promise<T> {
    return this.getDAO(subPath)
      .addOrSet(data)
      .then((id) => this.get(id, subPath))
  }

  async addAll(data: Array<OptionalIdStorable<T>>, subPath = ''): Promise<T[]> {
    return this.getDAO(subPath)
      .bulkAdd(data)
      .then(() => this.fetchAll())
  }

  async fetchAll(subPath = ''): Promise<T[]> {
    return this.getDAO(subPath).fetchAll()
  }

  /**
   * Updates data in the collection
   * @param data Data to update – id property must be present
   * @param subPath path to the subcollection the data is found. rootPath if left blank
   */
  async update(data: Storable<T>, subPath = ''): Promise<T> {
    return this.getDAO(subPath)
      .set(data)
      .then((id) => this.get(id))
  }

  /**
   * Updates one field in a document
   * @param id identifier for the document in the collection
   * @param fieldName field / property name to update
   * @param fieldValue field / property value to update
   * @param subPath path to the subcollection where we add data. rootPath if left blank
   */
  async updateProperty(
    id: string,
    fieldName: string,
    fieldValue: unknown,
    subPath = '',
  ): Promise<T> {
    await this.doc(id, subPath).update({
      [fieldName]: fieldValue,
    })
    return this.get(id, subPath)
  }

  /**
   * Updates fields in a document
   * @param id identifier for the document in the collection
   * @param fields field name as key and field value as value
   * @param fieldValue field / property value to update
   */
  async updateProperties(id: string, fields: Record<string, unknown>, subPath = ''): Promise<T> {
    return this.doc(id, subPath)
      .update({
        ...fields,
      })
      .then(() => this.get(id, subPath))
  }

  /**
   * Increments the given property of the specified document by the count given
   * @param id identifier for the document in the collection
   * @param fieldName field / property name to increment
   * @param byCount how much to increment
   */
  async increment(id: string, fieldName: string, byCount: number, subPath = ''): Promise<T> {
    return this.doc(id, subPath)
      .update({
        [fieldName]: firestore.FieldValue.increment(byCount),
      })
      .then(() => this.get(id))
  }

  /**
   * Gets a document using it's identifier
   * @param id identifier for a document in the collection
   * @param subPath path to the subcollection where the document is found. rootPath if left blank
   */
  async get(id: string, subPath = ''): Promise<T> {
    const dao = this.getDAO(subPath)
    const result: T = await dao.fetch(id)
    return result
  }

  async findWhereEqual(property: string, value: unknown, subPath = ''): Promise<T[]> {
    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(property)
    return await this.getDAO(subPath).where(fieldPath, '==', value).fetch()
  }

  async findWhereMapHasKeyValueEqual(
    map: string,
    key: string,
    value: unknown,
    subPath = '',
  ): Promise<T[]> {
    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(map, key)
    return await this.getDAO(subPath).where(fieldPath, '==', value).fetch()
  }

  async findWhereMapHasKeyValueIn(
    map: string,
    key: string,
    value: unknown,
    subPath = '',
  ): Promise<T[]> {
    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(map, key)
    return await this.getDAO(subPath).where(fieldPath, 'in', value).fetch()
  }

  async delete(id: string, subPath = ''): Promise<void> {
    const dao = this.getDAO(subPath)
    await dao.delete(id)
  }

  async deleteAll(subPath = ''): Promise<void> {
    const dao = this.getDAO(subPath)
    const results = await dao.fetchAll()
    await dao.bulkDelete(results.map((o) => o.id))
  }
}

export default DataModel
