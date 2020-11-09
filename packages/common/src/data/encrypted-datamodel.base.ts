import DataStore from './datastore'
import DataModel, {IDataModel} from './datamodel.base'
import {HasId, OptionalIdStorable, Storable} from '@firestore-simple/admin/dist/types'
import {serverTimestamp} from '../utils/times'
import {EncryptionService} from '../service/encryption/encryption-service'
import {DataModelFieldMap, DataModelOrdering} from './datamodel.base'

abstract class EncryptedDataModel<T extends HasId> {
  abstract readonly rootPath: string
  private getRootPath() {
    // give access in constructor
    return this.rootPath
  }
  // @ts-ignore
  protected encryptedFields: Set<Partial<keyof Omit<T, 'id', 'timestamps'>>>

  private encryptionService: EncryptionService
  private dataModel: IDataModel<T>
  private dataStore: DataStore

  constructor(dataStore: DataStore) {
    this.encryptionService = new EncryptionService()
    const rootPath = this.getRootPath()

    class InnerModel extends DataModel<T> {
      rootPath = rootPath
      zeroSet = []
    }
    this.dataStore = dataStore
    this.dataModel = new InnerModel(dataStore)
  }

  /**
   * @override Adds data to the collection
   * @param data Data to add - id does not need to be present.
   * @param subPath path to the subcollection where we add data. rootPath if left blank
   */
  add(data: OptionalIdStorable<T>, subPath = ''): Promise<T> {
    const dataToAdd = (this.encryptDocument(data) as unknown) as OptionalIdStorable<T>
    return this.dataModel.add(dataToAdd, subPath)
  }

  async addAll(data: Array<OptionalIdStorable<T>>, subPath = ''): Promise<T[]> {
    const dataArray: Array<OptionalIdStorable<T>> = data.map(
      (item: OptionalIdStorable<T>) =>
        (this.encryptDocument(item) as unknown) as OptionalIdStorable<T>,
    )
    return this.dataModel.addAll(dataArray, subPath)
  }

  updateProperty(id: string, fieldName: string, fieldValue: unknown, subPath = ''): Promise<T> {
    return this.updateProperties(id, {[fieldName]: fieldValue}, subPath)
  }

  async updateProperties(id: string, fields: Record<string, unknown>, subPath = ''): Promise<T> {
    const {timestamps, ...fieldsWithoutTimestamps} = fields

    const encryptedFields = Object.entries(fields)
      .filter(([field]) => this.isEncryptedField(field))
      .reduce((byField, [field, value]) => {
        return {
          ...byField,
          [field]: this.encryptionService.encrypt(value.toString()),
        }
      }, {})

    return this.dataModel.updateProperties(
      id,
      {
        ...fieldsWithoutTimestamps,
        ...encryptedFields,
        'timestamps.updatedAt': serverTimestamp(),
      },
      subPath,
    )
  }

  async update(data: Storable<T>, subPath = ''): Promise<T> {
    const {id, ...fields} = data
    return this.updateProperties(id, fields, subPath)
  }

  async updateAll(data: Array<Storable<T>>, subPath = ''): Promise<T[]> {
    return Promise.all(data.map((item) => this.update(item, subPath)))
  }

  async fetchAll(subPath = ''): Promise<T[]> {
    return this.dataModel.fetchAll(subPath).then((docs: T[]) => this.decryptDocuments(docs))
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

    return await this.dataModel
      .findWhereArrayInMapContainsAny(map, key, processedValue, subPath)
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

    return await this.dataModel
      .findWhereArrayInMapContains(map, key, processedValue, subPath)
      .then((docs: T[]) => this.decryptDocuments(docs))
  }

  async findWhereArrayContains(property: string, value: unknown, subPath = ''): Promise<T[]> {
    const processedValue = this.isEncryptedField(property)
      ? this.encryptionService.encrypt(value.toString())
      : value

    return await this.dataModel
      .findWhereArrayContains(property, processedValue, subPath)
      .then((docs: T[]) => this.decryptDocuments(docs))
  }

  async findWhereArrayContainsAny(
    property: string,
    values: Iterable<unknown>,
    subPath = '',
    identity = (element: T) => element.id,
  ): Promise<T[]> {
    const processedValues = this.isEncryptedField(property)
      ? [...values].map((value) => this.encryptionService.encrypt(value.toString()))
      : values

    return await this.dataModel
      .findWhereArrayContainsAny(property, processedValues, subPath, identity)
      .then((docs: T[]) => this.decryptDocuments(docs))
  }

  async findWhereIdIn(values: unknown[], subPath = ''): Promise<T[]> {
    return this.dataModel
      .findWhereIdIn(values, subPath)
      .then((docs: T[]) => this.decryptDocuments(docs))
  }

  async findOneById(value: unknown, subPath = ''): Promise<T> {
    return this.dataModel
      .findOneById(value, subPath)
      .then((doc: T) => this.decryptDocument((doc as unknown) as OptionalIdStorable<T>))
  }

  async findWhereMapHasKeyValueIn(
    map: string,
    key: string,
    value: unknown,
    subPath = '',
  ): Promise<T[]> {
    const encryptedValue = this.isEncryptedField(key)
      ? this.encryptionService.encrypt(value.toString())
      : value
    return this.dataModel
      .findWhereMapHasKeyValueIn(map, key, encryptedValue, subPath)
      .then((docs: T[]) => this.decryptDocuments(docs))
  }

  async findWhereIn(
    property: string,
    values: Iterable<unknown>,
    subPath = '',
    identity = (element: T) => element.id,
  ): Promise<T[]> {
    const processedValues = this.isEncryptedField(property)
      ? [...values].map((value) => this.encryptionService.encrypt(value.toString()))
      : values

    return this.dataModel.findWhereIn(property, processedValues, subPath, identity)
  }

  get(id: string, subPath = ''): Promise<T> {
    return this.dataModel.get(id, subPath).then((doc: T) => {
      const data = (doc as unknown) as OptionalIdStorable<T>

      return this.decryptDocument(data)
    })
  }

  findWhereEqual(property: string, value: unknown, subPath = ''): Promise<T[]> {
    const processedValue = this.isEncryptedField(property)
      ? this.encryptionService.encrypt(value.toString())
      : value
    return this.dataModel
      .findWhereEqual(property, processedValue, subPath)
      .then((docs: T[]) => this.decryptDocuments(docs))
  }

  findWhereEqualWithMax(
    property: string,
    value: unknown,
    sortKey: Exclude<keyof T, 'id'>,
    subPath = '',
  ): Promise<T[]> {
    const processedValue = this.isEncryptedField(property)
      ? this.encryptionService.encrypt(value.toString())
      : value

    return this.dataModel
      .findWhereEqualWithMax(property, processedValue, sortKey, subPath)
      .then((docs: T[]) => this.decryptDocuments(docs))
  }

  findWhereArrayContainsWithMax(
    property: string,
    value: unknown,
    sortKey: Exclude<keyof T, 'id'>,
    subPath = '',
  ): Promise<T[]> {
    const processedValue = this.isEncryptedField(property)
      ? this.encryptionService.encrypt(value.toString())
      : value

    return this.dataModel
      .findWhereArrayContainsWithMax(property, processedValue, sortKey, subPath)
      .then((docs: T[]) => this.decryptDocuments(docs))
  }

  findWhereEqualInMap(
    fields: DataModelFieldMap[],
    order?: DataModelOrdering,
    subPath = '',
  ): Promise<T[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processedValues = fields.map((field) => {
      if (this.isEncryptedField(field.key)) {
        return {
          ...field,
          value: this.encryptionService.encrypt(field.value.toString()),
        }
      }
      return field
    })
    return this.dataModel
      .findWhereEqualInMap(processedValues, order, subPath)
      .then((docs: T[]) => this.decryptDocuments(docs))
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
