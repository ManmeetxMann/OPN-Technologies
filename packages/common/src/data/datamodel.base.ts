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
   * Resets the collection
   */
  public initialize(): Promise<unknown> {
    // Add all intial values
    return Promise.all(
      this.zeroSet.map(
        async (record): Promise<void> => {
          const currentDocument = await this.datastore.firestoreAdmin
            .firestore()
            .collection(this.rootPath)
            .doc(record.id)
            .get()
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

  collection(): Collection<T> {
    return this.datastore.firestoreORM.collection<T>({path: this.rootPath})
  }

  /**
   * Adds data to the collection
   * @param data Data to add - id does not need to be present.
   */
  add(data: OptionalIdStorable<T>): Promise<T> {
    return this.collection()
      .addOrSet(data)
      .then((id) => this.get(id))
  }

  addAll(data: Array<OptionalIdStorable<T>>): Promise<T[]> {
    return this.collection()
      .bulkAdd(data)
      .then(() => this.fetchAll())
  }

  fetchAll(): Promise<T[]> {
    return this.collection().fetchAll()
  }

  count(): Promise<number> {
    return this.collection()
      .fetchAll()
      .then((results) => results.length)
  }

  /**
   * Updates data in the collection
   * @param data Data to update – id property must be present
   */
  update(data: Storable<T>): Promise<T> {
    return this.collection()
      .set(data)
      .then((id) => this.get(id))
  }

  /**
   * Updates one field in a document
   * @param id identifier for the document in the collection
   * @param fieldName field / property name to update
   * @param fieldValue field / property value to update
   */
  updateProperty(id: string, fieldName: string, fieldValue: unknown): Promise<T> {
    return this.get(id).then((data) =>
      this.update({
        ...data,
        [fieldName]: fieldValue,
      } as Storable<T>),
    )
  }

  /**
   * Updates fields in a document
   * @param id identifier for the document in the collection
   * @param fields field name as key and field value as value
   */
  updateProperties(id: string, fields: Record<string, unknown>): Promise<T> {
    return this.datastore.firestoreAdmin
      .firestore()
      .collection(this.rootPath)
      .doc(id)
      .update({
        ...fields,
      })
      .then(() => this.get(id))
  }

  /**
   * Increments the given property of the specified document by the count given
   * @param id identifier for the document in the collection
   * @param fieldName field / property name to increment
   * @param byCount how much to increment
   */
  increment(id: string, fieldName: string, byCount: number): Promise<T> {
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
  get(id: string): Promise<T> {
    return this.collection().fetch(id)
  }

  findWhereEqual(property: string, value: unknown): Promise<T[]> {
    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(property)
    return this.collection().where(fieldPath, '==', value).fetch()
  }

  findWhereMapHasKeyValueEqual(map: string, key: string, value: unknown): Promise<T[]> {
    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(map, key)
    return this.collection().where(fieldPath, '==', value).fetch()
  }

  delete(id: string): Promise<void> {
    return this.collection()
      .delete(id)
      .then(() => console.log(`Delete ${this.rootPath}/${id}`))
  }
}

export default DataModel
