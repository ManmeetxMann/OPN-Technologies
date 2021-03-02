import DataStore from '../../../common/src/data/datastore'
import {TestKitBatch, TestKitBatchID} from '../models/test-kit-batch'
import {TestKitBatchRepository} from '../respository/test-kit-batch.repository'

export class TestKitBatchService {
  private dataStore = new DataStore()
  private testKitBatchRepository = new TestKitBatchRepository(this.dataStore)

  getAll(): Promise<TestKitBatch[]> {
    return this.testKitBatchRepository.getAll()
  }

  save(TestKitBatch: Omit<TestKitBatch, 'id'>): Promise<TestKitBatchID> {
    return this.testKitBatchRepository.add(TestKitBatch)
  }
}
