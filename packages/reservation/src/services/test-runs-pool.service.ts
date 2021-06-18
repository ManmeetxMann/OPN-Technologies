import DataStore from '../../../common/src/data/datastore'
import {TestRunsPoolRepository} from '../respository/test-runs-pool.repository'
import {TestRunsPool, TestRunsPoolCreate, TestRunsPoolUpdate} from '../models/test-runs-pool'
import {cleanUndefinedKeys} from '../../../common/src/utils/utils'

export class TestRunsPoolService {
  private dataStore = new DataStore()
  private testRunPoolRepository = new TestRunsPoolRepository(this.dataStore)

  create(testRunPool: TestRunsPoolCreate): Promise<TestRunsPool> {
    return this.testRunPoolRepository.save(testRunPool)
  }

  update(id: string, data: Partial<TestRunsPoolCreate>): Promise<TestRunsPool> {
    const cleanData = cleanUndefinedKeys(data)
    return this.testRunPoolRepository.updateProperties(id, cleanData as TestRunsPoolUpdate)
  }

  getById(id: string): Promise<TestRunsPool> {
    return this.testRunPoolRepository.findOneById(id)
  }
}
