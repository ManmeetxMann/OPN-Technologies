import DataStore from '../../../common/src/data/datastore'
import {TestKitBatch, TestKitBatchID, TestKitBatchPostRequest} from '../models/test-kit-batch'
import {TestKitBatchRepository} from '../respository/test-kit-batch.repository'

export class TestKitBatchService {
  private dataStore = new DataStore()
  private testKitBatchRepository = new TestKitBatchRepository(this.dataStore)

  getAll(): Promise<TestKitBatch[]> {
    return this.testKitBatchRepository.getAll()
  }

  save(testKitBatch: TestKitBatchPostRequest): Promise<TestKitBatchID> {
    return this.testKitBatchRepository.add(testKitBatch)
  }
}
