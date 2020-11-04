import DataStore from './datastore'
import DataModel from './datamodel.base'
import {HasId, OptionalIdStorable, Storable} from '@firestore-simple/admin/dist/types'
import * as _ from 'lodash'
import {serverTimestamp} from '../utils/times'
import {EncryptionService} from '../service/encryption/encryption-service'
import {DataModelFieldMap, DataModelOrdering} from './datamodel.base'

abstract class EncryptedDataModel<T extends HasId> extends DataModel<T> {
  protected encryptedFields: Set<Partial<keyof Omit<T, 'id'>>>
  private encryptionService: EncryptionService

  constructor(datastore: DataStore) {
    super(datastore)
    this.encryptionService = new EncryptionService()
  }

  /**
   * @override Adds data to the collection
   * @param data Data to add - id does not need to be present.
   * @param subPath path to the subcollection where we add data. rootPath if left blank
   */
  add(data: OptionalIdStorable<T>, subPath = ''): Promise<T> {
    const processedData =
      this.encryptedFields.size > 0
        ? ((this.encryptDocument(data) as unknown) as OptionalIdStorable<T>)
        : data

    return this.collection(subPath)
      .addOrSet({
        ...processedData,
        timestamps: {
          createdAt: serverTimestamp(),
          updatedAt: null,
        },
      })
      .then((id) => this.get(id, subPath))
  }

  async addAll(data: Array<OptionalIdStorable<T>>, subPath = ''): Promise<T[]> {
    let dataArray: Array<OptionalIdStorable<T>> = []
    if (this.encryptedFields.size > 0) {
      data.forEach((item: OptionalIdStorable<T>) => {
        dataArray.push((this.encryptDocument(item) as unknown) as OptionalIdStorable<T>)
      })
    } else {
      dataArray = data
    }

    return this.collection(subPath)
      .bulkAdd(
        dataArray.map((d) => ({
          ...d,
          timestamps: {
            createdAt: serverTimestamp(),
            updatedAt: null,
          },
        })),
      )
      .then(() => this.fetchAll())
  }

  /**
   * Updates one field in a document
   * @param id identifier for the document in the collection
   * @param fieldName field / property name to update
   * @param fieldValue field / property value to update
   * @param subPath path to the subcollection where we add data. rootPath if left blank
   */
  updateProperty(id: string, fieldName: string, fieldValue: unknown, subPath = ''): Promise<T> {
    return this.updateProperties(id, {[fieldName]: fieldValue}, subPath)
  }

  /**
   * Updates fields in a document
   * @param id identifier for the document in the collection
   * @param fields field name as key and field value as value
   */
  async updateProperties(id: string, fields: Record<string, unknown>, subPath = ''): Promise<T> {
    const {timestamps, ...fieldsWithoutTimestamps} = fields

    const fieldsProcessed: Record<string, unknown> = {}
    Object.keys(fieldsWithoutTimestamps).forEach((key: string) => {
      Object.assign(fieldsProcessed, {
        [key]: this.isEncryptedField(key)
          ? this.encryptionService.encrypt(fieldsWithoutTimestamps[key].toString())
          : fieldsWithoutTimestamps[key],
      })
    })

    return this.doc(id, subPath)
      .update({
        ...fieldsProcessed,
        'timestamps.updatedAt': serverTimestamp(),
      })
      .then(() => this.get(id, subPath))
  }

  /**
   * Updates data in the collection
   * @param data Data to update – id property must be present
   * @param subPath path to the subcollection the data is found. rootPath if left blank
   */
  async update(data: Storable<T>, subPath = ''): Promise<T> {
    const {id, ...fields} = data
    return this.updateProperties(id, fields, subPath)
  }

  async updateAll(data: Array<Storable<T>>, subPath = ''): Promise<T[]> {
    return Promise.all(data.map((item) => this.update(item, subPath)))
  }

  async fetchAll(subPath = ''): Promise<T[]> {
    return this.collection(subPath)
      .fetchAll()
      .then((docs: T[]) => this.decryptDocuments(docs))
  }

  async findWhereArrayInMapContainsAny(
    map: string,
    key: string,
    value: unknown,
    subPath = '',
  ): Promise<T[]> {
    const processedValue = this.isEncryptedField(key)
      ? this.encryptionService.encrypt(value.toString())
      : value

    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(map, key)

    return await this.collection(subPath)
      .where(fieldPath, 'array-contains-any', processedValue)
      .fetch()
      .then((docs: T[]) => this.decryptDocuments(docs))
  }

  async findWhereArrayInMapContains(
    map: string,
    key: string,
    value: unknown,
    subPath = '',
  ): Promise<T[]> {
    const processedValue = this.isEncryptedField(key)
      ? this.encryptionService.encrypt(value.toString())
      : value

    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(map, key)

    return await this.collection(subPath)
      .where(fieldPath, 'array-contains', processedValue)
      .fetch()
      .then((docs: T[]) => this.decryptDocuments(docs))
  }

  async findWhereArrayContains(property: string, value: unknown, subPath = ''): Promise<T[]> {
    const processedValue = this.isEncryptedField(property)
      ? this.encryptionService.encrypt(value.toString())
      : value

    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(property)

    return await this.collection(subPath)
      .where(fieldPath, 'array-contains', processedValue)
      .fetch()
      .then((docs: T[]) => this.decryptDocuments(docs))
  }

  async findWhereArrayContainsAny(
    property: string,
    values: Iterable<unknown>,
    subPath = '',
    identity = (element: T) => element.id,
  ): Promise<T[]> {
    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(property)
    const processedValues = this.isEncryptedField(property)
      ? [...values].map((value) => this.encryptionService.encrypt(value.toString()))
      : values

    const chunks: unknown[][] = _.chunk([...processedValues], 10)
    const allResults = await Promise.all(
      chunks.map((chunk) =>
        this.collection(subPath)
          .where(fieldPath, 'array-contains-any', chunk)
          .fetch()
          .then((docs: T[]) => this.decryptDocuments(docs)),
      ),
    )
    const deduplicated: Record<string, T> = {}
    allResults.forEach((page) => page.forEach((item) => (deduplicated[identity(item)] = item)))
    return Object.values(deduplicated)
  }

  async findWhereIdIn(values: unknown[], subPath = ''): Promise<T[]> {
    const fieldPath = this.datastore.firestoreAdmin.firestore.FieldPath.documentId()

    const chunks: unknown[][] = _.chunk([...values], 10)

    const allResults = await Promise.all(
      chunks.map((chunk) =>
        this.collection(subPath)
          .where(fieldPath, 'in', chunk)
          .fetch()
          .then((docs: T[]) => this.decryptDocuments(docs)),
      ),
    )

    const deduplicated: Record<string, T> = {}
    allResults.forEach((page) => page.forEach((item) => (deduplicated[item.id] = item)))

    return Object.values(deduplicated)
  }

  async findOneById(value: unknown, subPath = ''): Promise<T> {
    const fieldPath = this.datastore.firestoreAdmin.firestore.FieldPath.documentId()
    const results = await this.collection(subPath).where(fieldPath, '==', value).fetch()
    if (results.length) {
      return this.decryptDocument((results[0] as unknown) as OptionalIdStorable<T>)
    }

    return null
  }

  async findWhereMapHasKeyValueIn(
    map: string,
    key: string,
    value: unknown,
    subPath = '',
  ): Promise<T[]> {
    const processedValue = this.isEncryptedField(key)
      ? this.encryptionService.encrypt(value.toString())
      : value

    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(map, key)

    return await this.collection(subPath)
      .where(fieldPath, 'in', processedValue)
      .fetch()
      .then((docs: T[]) => this.decryptDocuments(docs))
  }

  async findWhereIn(
    property: string,
    values: Iterable<unknown>,
    subPath = '',
    identity = (element: T) => element.id,
  ): Promise<T[]> {
    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(property)

    const processedValues = this.isEncryptedField(property)
      ? [...values].map((value) => this.encryptionService.encrypt(value.toString()))
      : values

    const chunks: unknown[][] = _.chunk([...processedValues], 10)
    const allResults = await Promise.all(
      chunks.map((chunk) =>
        this.collection(subPath)
          .where(fieldPath, 'in', chunk)
          .fetch()
          .then((docs: T[]) => this.decryptDocuments(docs)),
      ),
    )

    const deduplicated: Record<string, T> = {}
    allResults.forEach((page) => page.forEach((item) => (deduplicated[identity(item)] = item)))

    return Object.values(deduplicated)
  }

  get(id: string, subPath = ''): Promise<T> {
    return this.collection(subPath)
      .fetch(id)
      .then((doc: T) => {
        const data = (doc as unknown) as OptionalIdStorable<T>

        return this.decryptDocument(data)
      })
  }

  findWhereEqual(property: string, value: unknown, subPath = ''): Promise<T[]> {
    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(property)

    const processedValue = this.isEncryptedField(property)
      ? this.encryptionService.encrypt(value.toString())
      : value

    return this.collection(subPath)
      .where(fieldPath, '==', processedValue)
      .fetch()
      .then((docs: T[]) => this.decryptDocuments(docs))
  }

  findWhereEqualWithMax(
    property: string,
    value: unknown,
    sortKey: Exclude<keyof T, 'id'>,
    subPath = '',
  ): Promise<T[]> {
    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(property)

    const processedValue = this.isEncryptedField(property)
      ? this.encryptionService.encrypt(value.toString())
      : value

    return this.collection(subPath)
      .where(fieldPath, '==', processedValue)
      .orderBy(sortKey, 'desc')
      .limit(1)
      .fetch()
      .then((docs: T[]) => this.decryptDocuments(docs))
  }

  findWhereArrayContainsWithMax(
    property: string,
    value: unknown,
    sortKey: Exclude<keyof T, 'id'>,
    subPath = '',
  ): Promise<T[]> {
    const fieldPath = new this.datastore.firestoreAdmin.firestore.FieldPath(property)

    const processedValue = this.isEncryptedField(property)
      ? this.encryptionService.encrypt(value.toString())
      : value

    return this.collection(subPath)
      .where(fieldPath, 'array-contains', processedValue)
      .orderBy(sortKey, 'desc')
      .limit(1)
      .fetch()
      .then((docs: T[]) => this.decryptDocuments(docs))
  }

  findWhereEqualInMap(
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

      const processedValue = this.isEncryptedField(field.key)
        ? this.encryptionService.encrypt(field.value.toString())
        : field.value

      collection = collection.where(fieldPath, field.operator, processedValue)
    }
    if (order) {
      collection = collection.orderBy(order.key, order.direction)
    }
    return collection.fetch().then((docs: T[]) => this.decryptDocuments(docs))
  }

  encryptDocument(data: OptionalIdStorable<T>): T {
    const cipherData: T = <T>{}

    Object.keys(data).forEach((key: string) => {
      if (this.isEncryptedField(key)) {
        cipherData[key] = this.encryptionService.encrypt(data[key].toString())
      } else {
        cipherData[key] = data[key]
      }
    })

    return cipherData
  }

  decryptDocument(data: OptionalIdStorable<T>): T {
    const plainData: T = <T>{}

    Object.keys(data).forEach((key: string) => {
      if (this.isEncryptedField(key)) {
        plainData[key] = this.encryptionService.decrypt(data[key])
      } else {
        plainData[key] = data[key]
      }
    })
    return plainData
  }

  isEncryptedField(fieldName: string): boolean {
    if (fieldName === 'id') return false
    // @ts-ignore
    return this.encryptedFields.has(fieldName)
  }

  decryptDocuments(docs: T[]): T[] {
    return docs.map((doc: T) => {
      const data = (doc as unknown) as OptionalIdStorable<T>
      return this.decryptDocument(data)
    })
  }
}

export default EncryptedDataModel
