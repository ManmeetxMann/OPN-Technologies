import DataStore from '../../../common/src/data/datastore'
import {TestRunsPoolRepository} from '../respository/test-runs-pool.repository'
import {TestRunsPool, TestRunsPoolCreate} from '../models/test-runs-pool'

export class TestRunsPoolService {
  private dataStore = new DataStore()
  private testRunPoolRepository = new TestRunsPoolRepository(this.dataStore)

  create(testRunPool: TestRunsPoolCreate): Promise<TestRunsPool> {
    return this.testRunPoolRepository.save(testRunPool)
  }
}
