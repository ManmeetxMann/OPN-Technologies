import DataStore from '../../../common/src/data/datastore'
import {IdentifiersModel} from '../../../common/src/data/identifiers'
import {TestRunsRepository} from '../respository/test-runs.repository'
import {TestRunDBModel} from '../models/test-runs'
import {firestore} from 'firebase-admin'
import {getDateFromDatetime} from '../utils/datetime.helper'

export class TestRunsService {
  private dataStore = new DataStore()
  private identifier = new IdentifiersModel(this.dataStore)
  private testRunsRepository = new TestRunsRepository(new DataStore())

  async getTestRunByTestRunId(testRunId: string): Promise<TestRunDBModel> {
    const testRuns = await this.testRunsRepository.findWhereEqual('testRunId', testRunId)
    if (testRuns.length > 1) {
      console.log(`Multiple Test run found with TestRunId, testRunId: ${testRunId}`)
    }
    return testRuns[0]
  }

  getTestRunsByDate(date: string): Promise<TestRunDBModel[]> {
    return this.testRunsRepository.findWhereEqual('testRunDate', date)
  }

  create(testRunDateTime: Date): Promise<TestRunDBModel> {
    const testRunDate = getDateFromDatetime(testRunDateTime)
    return this.identifier.getUniqueId('testRun').then((id) => {
      return this.testRunsRepository.add({
        testRunId: `T${id}`,
        testRunDateTime: firestore.Timestamp.fromDate(testRunDateTime),
        testRunDate,
      } as TestRunDBModel)
    })
  }
}
