import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {TestKitBatch, TestKitBatchID} from '../models/test-kit-batch'

export class TestKitBatchRepository extends DataModel<TestKitBatch> {
  public rootPath = 'test-kit-batches'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  public async save(testKitBatch: Omit<TestKitBatch, 'id'>): Promise<TestKitBatchID> {
    return this.add(testKitBatch)
  }
}
