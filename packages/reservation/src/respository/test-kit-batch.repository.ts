import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import DbSchema from '../dbschemas/test-kit-batches.schema'
import {TestKitBatch, TestKitBatchID, TestKitBatchPostRequest} from '../models/test-kit-batch'

export class TestKitBatchRepository extends DataModel<TestKitBatch> {
  public rootPath = 'test-kit-batches'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  public async getAll(): Promise<TestKitBatch[]> {
    return this.fetchAll()
  }

  public async save(testKitBatch: TestKitBatchPostRequest): Promise<TestKitBatchID> {
    const validTestKitBatch = await DbSchema.validateAsync(testKitBatch)
    return this.add(validTestKitBatch)
  }
}
