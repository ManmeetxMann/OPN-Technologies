import DataStore from '../../../common/src/data/datastore'
import {DateTestRunsRepository, TestRunsRepository} from '../respository/test-runs.repository'
import {TestRunDBModel} from '../models/test-runs'
import {firestore} from 'firebase-admin'
import {
  getDateFromDatetime,
  getDayFromDatetime,
  getMonthFromDatetime,
} from '../utils/datetime.helper'
import {DataModelFieldMapOperatorType} from '../../../common/src/data/datamodel.base'

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

  async getTestRunByTestRunIds(testRunIds: string[]): Promise<TestRunDBModel[]> {
    return this.testRunsRepository.findWhereIn('testRunId', testRunIds)
  }

  async getTestRunsByDate(date: string, labId: string): Promise<TestRunDBModel[]> {
    return this.testRunsRepository.findWhereEqualInMap([
      {
        map: '/',
        key: 'testRunDate',
        operator: DataModelFieldMapOperatorType.Equals,
        value: date,
      },
      {
        map: '/',
        key: 'labId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: labId,
      },
    ])
  }

  async getIdentifierRepository(testRunDate: string): Promise<DateTestRunsRepository> {
    return new DateTestRunsRepository(this.dataStore, testRunDate)
  }

  async create(
    testRunDateTime: Date,
    name: string,
    labId: string,
    createdBy: string,
  ): Promise<TestRunDBModel> {
    const testRunDate = getDateFromDatetime(testRunDateTime)
    const transportDay = getDayFromDatetime(testRunDateTime)
    const transportMonth = getMonthFromDatetime(testRunDateTime)

    const id = await (await this.getIdentifierRepository(testRunDate)).getUniqueId('testRun')
    return await this.testRunsRepository.save({
      testRunId: `RUN${id}-${transportDay}${transportMonth}`,
      testRunDateTime: firestore.Timestamp.fromDate(testRunDateTime),
      testRunDate,
      name,
      labId,
      createdBy,
    } as TestRunDBModel)
  }
}
