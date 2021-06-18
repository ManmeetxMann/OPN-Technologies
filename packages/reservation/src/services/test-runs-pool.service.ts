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

  async update(id: string, data: TestRunsPoolUpdate): Promise<TestRunsPool> {
    const cleanData = cleanUndefinedKeys(data) as TestRunsPoolUpdate

    return this.testRunPoolRepository.updateProperties(id, cleanData as TestRunsPoolUpdate)
  }

  getById(id: string): Promise<TestRunsPool> {
    return this.testRunPoolRepository.findOneById(id)
  }

  async addTestResultInPool(id: string, testResultId: string): Promise<TestRunsPool> {
    const {testResultIds} = await this.getById(id)
    return this.update(id, {testResultIds: [...testResultIds, testResultId]})
  }
}
