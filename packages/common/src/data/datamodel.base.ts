import DataStore from './datastore'
import {HasId, OptionalIdStorable, Storable} from '@firestore-simple/admin/dist/types'
import {firestore} from 'firebase-admin'
import {Collection, Query} from '@firestore-simple/admin'
import * as _ from 'lodash'
import {serverTimestamp} from '../utils/times'

export enum DataModelFieldMapOperatorType {
  Equals = '==',
  NotEquals = '!=',
  GreatOrEqual = '>=',
  LessOrEqual = '<=',
  ArrayContains = 'array-contains',
  Greater = '>',
  Less = '<',
  In = 'in',
  NotIn = 'not-in',
  ArrayContainsAny = 'array-contains-any',
}

export type DataModelFieldMap = {
  map: string
  key: string
  operator: DataModelFieldMapOperatorType
  value: unknown
}

export type DataModelOrdering = {
  key: string
  direction: 'desc' | 'asc'
}

export interface IDataModel<T extends HasId> {
  /**
   * Get a reference to a collection (NOT a CollectionReference) at the given path
   * @param subPath the path, after rootpath, to the collection
   */
  collection(subPath?: string): Collection<T>

  /**
   * Resets the collection
   */
  initialize(): Promise<unknown>

  /**
   * Adds data to the collection
   * @param data Data to add - id does not need to be present.
   * @param subPath path to the subcollection where we add data. rootPath if left blank
   */
  add(data: OptionalIdStorable<T>, subPath?: string): Promise<T>

  addAll(data: Array<OptionalIdStorable<T>>, subPath?: string): Promise<T[]>

  updateProperty(id: string, fieldName: string, fieldValue: unknown, subPath?: string): Promise<T>

  /**
   * Updates fields in a document
   * @param id identifier for the document in the collection
   * @param fields field name as key and field value as value
   */
  updateProperties(id: string, fields: Record<string, unknown>, subPath?: string): Promise<T>

  /**
   * Updates data in the collection
   * @param data Data to update – id property must be present
   * @param subPath path to the subcollection the data is found. rootPath if left blank
   */
  update(data: Storable<T>, subPath?: string): Promise<T>

  updateAll(data: Array<Storable<T>>, subPath?: string): Promise<T[]>

  fetchAll(subPath?: string): Promise<T[]>

  fetchPage(
    query: Query<T, Omit<T, 'id'>>,
    page: number,
    perPage: number,
    subPath?: string,
  ): Promise<T[]>

  fetchAllWithPagination(page: number, perPage: number, subPath: string): Promise<T[]>

  /**
   * Increments the given property of the specified document by the count given
   * @param id identifier for the document in the collection
   * @param fieldName field / property name to increment
   * @param byCount how much to increment
   */
  increment(id: string, fieldName: string, byCount: number, subPath?: string): Promise<T>

  getQueryFindWhereArrayInMapContainsAny(
    map: string,
    key: string,
    value: unknown,
    subPath: string,
  ): Query<T, Omit<T, 'id'>>

  findWhereArrayInMapContainsAny(
    map: string,
    key: string,
    value: unknown,
    subPath?: string,
  ): Promise<T[]>

  getQueryFindWhereArrayInMapContains(
    map: string,
    key: string,
    value: unknown,
    subPath: string,
  ): Query<T, Omit<T, 'id'>>

  findWhereArrayInMapContains(
    map: string,
    key: string,
    value: unknown,
    subPath?: string,
  ): Promise<T[]>

  getQueryFindWhereArrayContains(
    property: string,
    value: unknown,
    subPath: string,
  ): Query<T, Omit<T, 'id'>>

  findWhereArrayContains(property: string, value: unknown, subPath?: string): Promise<T[]>

  findWhereArrayContainsAny(
    property: string,
    values: Iterable<unknown>,
    subPath?: string,
    identity?: (element: T) => unknown,
  ): Promise<T[]>

  findWhereIdIn(values: unknown[], subPath?: string): Promise<T[]>

  findOneById(value: unknown, subPath?: string): Promise<T>

  getQueryFindWhereMapHasKeyValueIn(
    map: string,
    key: string,
    value: unknown,
    subPath: string,
  ): Query<T, Omit<T, 'id'>>

  findWhereMapHasKeyValueIn(
    map: string,
    key: string,
    value: unknown,
    subPath?: string,
  ): Promise<T[]>

  findWhereIn(
    property: string,
    values: Iterable<unknown>,
    subPath?: string,
    identity?: (element: T) => unknown,
  ): Promise<T[]>

  get(id: string, subPath?: string): Promise<T>

  getQueryFindWhereEqual(property: string, value: unknown, subPath: string): Query<T, Omit<T, 'id'>>

  findWhereEqual(property: string, value: unknown, subPath?: string): Promise<T[]>

  getQueryFindWhereEqualWithMax(
    property: string,
    value: unknown,
    sortKey: Exclude<keyof T, 'id'>,
    subPath: string,
  ): Query<T, Omit<T, 'id'>>

  findWhereEqualWithMax(
    property: string,
    value: unknown,
    sortKey: Exclude<keyof T, 'id'>,
    subPath?: string,
  ): Promise<T[]>

  findWhereArrayContainsWithMax(
    property: string,
    value: unknown,
    sortKey: Exclude<keyof T, 'id'>,
    subPath?: string,
  ): Promise<T[]>

  findWhereEqualInMap(
    fields: DataModelFieldMap[],
    order?: DataModelOrdering,
    subPath?: string,
  ): Promise<T[]>

  delete(id: string, subPath?: string): Promise<void>

  count(subPath?: string): Promise<number>
}

abstract class BaseDataModel<T extends HasId> implements IDataModel<T> {
  abstract readonly rootPath: string
  protected abstract readonly zeroSet: Array<Storable<T>>
  protected datastore: DataStore

  constructor(datastore: DataStore) {
    this.datastore = datastore
  }

  protected doc(id: string, subPath = ''): firestore.DocumentReference {
    const path = subPath ? `${this.rootPath}/${subPath}` : this.rootPath
    return this.datastore.firestoreAdmin.firestore().collection(path).doc(id)
  }

  public collection(subPath = ''): Collection<T> {
    const path = subPath ? `${this.rootPath}/${subPath}` : this.rootPath
    return this.datastore.firestoreORM.collection<T>({path})
  }

  public async initialize(): Promise<unknown> {
    // Add all intial values
    return Promise.all(
      this.zeroSet.map(
        async (record): Promise<void> => {
          const currentDocument = await this.doc(record.id).get()
          if (currentDocument.exists) {
            console.log(`${record.id} already exists, skipping initialization`)
          } else {
            console.log(`initializing ${record.id}`)
            await this.add(record)
          }
        },
      ),
    )
  }

  public async add(data: OptionalIdStorable<T>, subPath = ''): Promise<T> {
    return this.collection(subPath)
      .addOrSet({
        ...data,
        timestamps: {
          createdAt: serverTimestamp(),
          updatedAt: null,
        },
      })
      .then((id) => this.get(id, subPath))
  }

  public async addAll(data: Array<OptionalIdStorable<T>>, subPath = ''): Promise<T[]> {
    return this.collection(subPath)
      .bulkAdd(
        data.map((d) => ({
          ...d,
          timestamps: {
            createdAt: serverTimestamp(),
            updatedAt: null,
          },
        })),
      )
      .then(() => this.fetchAll())
  }

  public async updateProperty(
    id: string,
    fieldName: string,
    fieldValue: unknown,
    subPath = '',
  ): Promise<T> {
    return this.updateProperties(id, {[fieldName]: fieldValue}, subPath)
  }

  public async updateProperties(
    id: string,
    fields: Record<string, unknown>,
    subPath = '',
  ): Promise<T> {
    const {timestamps, ...fieldsWithoutTimestamps} = fields
    return this.doc(id, subPath)
      .update({
        ...fieldsWithoutTimestamps,
        'timestamps.updatedAt': serverTimestamp(),
      })
      .then(() => this.get(id, subPath))
  }

  public async update(data: Storable<T>, subPath = ''): Promise<T> {
    const {id, ...fields} = data
    return this.updateProperties(id, fields, subPath)
  }

  public async updateAll(data: Array<Storable<T>>, subPath = ''): Promise<T[]> {
    return Promise.all(data.map((item) => this.update(item, subPath)))
  }

  public async fetchPage(
    query: Query<T, Omit<T, 'id'>>,
    page: number,
    perPage: number,
    subPath = '',
  ): Promise<T[]> {
    const subset = await query.limit(page === 0 ? perPage : page * perPage).fetch()

    if (page === 0) return subset.slice()

    if (!subset.length) return []

    const lastVisible = subset[subset.length - 1]
    const lastVisibleSnapshot = await this.collection(subPath).docRef(lastVisible.id).get()

    const nextPage = await query.limit(perPage).startAfter(lastVisibleSnapshot).fetch()
    return nextPage.slice()
  }

  public async fetchAll(subPath = ''): Promise<T[]> {
    return this.collection(subPath).fetchAll()
  }

  public async fetchAllWithPagination(page: number, perPage: number, subPath = ''): Promise<T[]> {
    return this.fetchPage(
      this.collection(subPath).limit(page === 0 ? perPage : page * perPage),
      page,
      perPage,
      subPath,
    )
  }

  public async increment(id: string, fieldName: string, byCount: number, subPath = ''): Promise<T> {
    return this.doc(id, subPath)
      .update({
        [fieldName]: firestore.FieldValue.increment(byCount),
        'timestamps.updatedAt': serverTimestamp(),
      })
      .then(() => this.get(id))
  }

  public getQueryFindWhereArrayInMapContainsAny(
    map: string,
    key: string,
    value: unknown,
    subPath = '',
  ): Query<T, Omit<T, 'id'>> {
    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(map, key)
    return this.collection(subPath).where(fieldPath, 'array-contains-any', value)
  }

  public async findWhereArrayInMapContainsAny(
    map: string,
    key: string,
    value: unknown,
    subPath = '',
  ): Promise<T[]> {
    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(map, key)
    return await this.collection(subPath).where(fieldPath, 'array-contains-any', value).fetch()
  }

  public getQueryFindWhereArrayInMapContains(
    map: string,
    key: string,
    value: unknown,
    subPath = '',
  ): Query<T, Omit<T, 'id'>> {
    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(map, key)
    return this.collection(subPath).where(fieldPath, 'array-contains', value)
  }

  public async findWhereArrayInMapContains(
    map: string,
    key: string,
    value: unknown,
    subPath = '',
  ): Promise<T[]> {
    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(map, key)
    return await this.collection(subPath).where(fieldPath, 'array-contains', value).fetch()
  }

  public getQueryFindWhereArrayContains(
    property: string,
    value: unknown,
    subPath = '',
  ): Query<T, Omit<T, 'id'>> {
    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(property)
    return this.collection(subPath).where(fieldPath, 'array-contains', value)
  }

  public async findWhereArrayContains(
    property: string,
    value: unknown,
    subPath = '',
  ): Promise<T[]> {
    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(property)
    return await this.collection(subPath).where(fieldPath, 'array-contains', value).fetch()
  }

  public async updateAllFromCollectionWhereEqual(
    property: string,
    value: unknown,
    data: unknown,
    subPath = '',
  ): Promise<unknown> {
    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(property)

    return this.collection(subPath)
      .where(fieldPath, '==', value)
      .fetch()
      .then((response) => {
        const batch = this.datastore.firestoreAdmin.firestore().batch()
        response.forEach((doc) => {
          const docRef = this.collection(subPath).docRef(doc.id)
          batch.update(docRef, data)
        })
        batch.commit()
      })
  }

  public async findWhereArrayContainsAny(
    property: string,
    values: Iterable<unknown>,
    subPath = '',
    identity = (element: T) => element.id,
  ): Promise<T[]> {
    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(property)
    const chunks: unknown[][] = _.chunk([...values], 10)
    const allResults = await Promise.all(
      chunks.map((chunk) =>
        this.collection(subPath).where(fieldPath, 'array-contains-any', chunk).fetch(),
      ),
    )
    const deduplicated: Record<string, T> = {}
    allResults.forEach((page) => page.forEach((item) => (deduplicated[identity(item)] = item)))
    return Object.values(deduplicated)
  }

  public async findWhereIdIn(values: unknown[], subPath = ''): Promise<T[]> {
    const fieldPath = this.datastore.firestoreAdmin.firestore.FieldPath.documentId()
    const chunks: unknown[][] = _.chunk([...values], 10)
    const allResults = await Promise.all(
      chunks.map((chunk) => this.collection(subPath).where(fieldPath, 'in', chunk).fetch()),
    )
    const deduplicated: Record<string, T> = {}
    allResults.forEach((page) => page.forEach((item) => (deduplicated[item.id] = item)))
    return Object.values(deduplicated)
  }

  public getWhereIdInQuery(values: unknown[], subPath = ''): Query<T, Omit<T, 'id'>>[] {
    const fieldPath = this.datastore.firestoreAdmin.firestore.FieldPath.documentId()
    const chunks: unknown[][] = _.chunk([...values], 10)
    return chunks.map((chunk) => this.collection(subPath).where(fieldPath, 'in', chunk))
  }

  public getWhereInQuery(
    property: string,
    values: unknown[],
    subPath = '',
  ): Query<T, Omit<T, 'id'>>[] {
    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(property)
    const chunks: unknown[][] = _.chunk([...values], 10)
    return chunks.map((chunk) => this.collection(subPath).where(fieldPath, 'in', chunk))
  }

  public async findOneById(value: unknown, subPath = ''): Promise<T> {
    const fieldPath = this.datastore.firestoreAdmin.firestore.FieldPath.documentId()
    const results = await this.collection(subPath).where(fieldPath, '==', value).fetch()
    if (results.length) {
      return results[0]
    }
    return null
  }

  public getQueryFindWhereMapHasKeyValueIn(
    map: string,
    key: string,
    value: unknown,
    subPath = '',
  ): Query<T, Omit<T, 'id'>> {
    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(map, key)
    return this.collection(subPath).where(fieldPath, 'in', value)
  }

  public async findWhereMapHasKeyValueIn(
    map: string,
    key: string,
    value: unknown,
    subPath = '',
  ): Promise<T[]> {
    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(map, key)
    return await this.collection(subPath).where(fieldPath, 'in', value).fetch()
  }

  public async findWhereIn(
    property: string,
    values: Iterable<unknown>,
    subPath = '',
    identity = (element: T) => element.id,
  ): Promise<T[]> {
    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(property)
    const chunks: unknown[][] = _.chunk([...values], 10)
    const allResults = await Promise.all(
      chunks.map((chunk) => this.collection(subPath).where(fieldPath, 'in', chunk).fetch()),
    )
    const deduplicated: Record<string, T> = {}
    allResults.forEach((page) => page.forEach((item) => (deduplicated[identity(item)] = item)))
    return Object.values(deduplicated)
  }

  public async get(id: string, subPath = ''): Promise<T> {
    return this.collection(subPath).fetch(id)
  }

  public getQueryFindWhereEqual(
    property: string,
    value: unknown,
    subPath = '',
  ): Query<T, Omit<T, 'id'>> {
    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(property)
    return this.collection(subPath).where(fieldPath, '==', value)
  }

  public async findWhereEqual(property: string, value: unknown, subPath = ''): Promise<T[]> {
    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(property)
    return this.collection(subPath).where(fieldPath, '==', value).fetch()
  }

  public getQueryFindWhereEqualWithMax(
    property: string,
    value: unknown,
    sortKey: Exclude<keyof T, 'id'>,
    subPath = '',
  ): Query<T, Omit<T, 'id'>> {
    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(property)
    return this.collection(subPath).where(fieldPath, '==', value).orderBy(sortKey, 'desc').limit(1)
  }

  public async findWhereEqualWithMax(
    property: string,
    value: unknown,
    sortKey: Exclude<keyof T, 'id'>,
    subPath = '',
  ): Promise<T[]> {
    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(property)
    return this.collection(subPath)
      .where(fieldPath, '==', value)
      .orderBy(sortKey, 'desc')
      .limit(1)
      .fetch()
  }

  public async findWhereArrayContainsWithMax(
    property: string,
    value: unknown,
    sortKey: Exclude<keyof T, 'id'>,
    subPath = '',
  ): Promise<T[]> {
    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(property)
    return this.collection(subPath)
      .where(fieldPath, 'array-contains', value)
      .orderBy(sortKey, 'desc')
      .limit(1)
      .fetch()
  }

  public async findWhereEqualInMap(
    fields: DataModelFieldMap[],
    order?: DataModelOrdering,
    subPath = '',
  ): Promise<T[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let collection: any = this.collection(subPath)
    for (const field of fields) {
      const fieldPath =
        !field.map || field.map === '/'
          ? new this.datastore.firestoreAdmin.firestore.FieldPath(field.key)
          : new this.datastore.firestoreAdmin.firestore.FieldPath(field.map, field.key)
      collection = collection.where(fieldPath, field.operator, field.value)
    }
    if (order) {
      collection = collection.orderBy(order.key, order.direction)
    }
    return collection.fetch()
  }

  public async delete(id: string, subPath = ''): Promise<void> {
    return this.collection(subPath)
      .delete(id)
      .then(() => console.log(`Delete ${this.rootPath}/${subPath ? `${subPath}/` : ''}${id}`))
  }

  public async count(subPath = ''): Promise<number> {
    return this.collection(subPath)
      .fetchAll()
      .then((results) => results.length)
  }
}

export default BaseDataModel
