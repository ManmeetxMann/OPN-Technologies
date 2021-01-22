import DataStore from '../../../common/src/data/datastore'
import {DateTestRunsRepository, TestRunsRepository} from '../respository/test-runs.repository'
import {TestRunDBModel} from '../models/test-runs'
import {firestore} from 'firebase-admin'
import {getDateFromDatetime} from '../utils/datetime.helper'
import moment from 'moment'

export class TestRunsService {
  private dataStore = new DataStore()
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

  getIdentifierRepository(testRunDate: string): DateTestRunsRepository {
    return new DateTestRunsRepository(this.dataStore, testRunDate)
  }

  create(testRunDateTime: Date, name: string): Promise<TestRunDBModel> {
    const testRunDate = getDateFromDatetime(testRunDateTime)
    const idDate = moment(testRunDate).format('YYYYMM')

    return this.getIdentifierRepository(testRunDate)
      .getUniqueId('testRun')
      .then((id) => {
        return this.testRunsRepository.save({
          testRunId: `T${idDate}-${id}`,
          testRunDateTime: firestore.Timestamp.fromDate(testRunDateTime),
          testRunDate,
          name,
        } as TestRunDBModel)
      })
  }
}
