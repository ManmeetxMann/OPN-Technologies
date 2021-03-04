import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
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
    return this.add(testKitBatch)
  }
}
