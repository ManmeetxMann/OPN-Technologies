import DataStore from '../../../common/src/data/datastore'
import {IdentifiersModel} from '../../../common/src/data/identifiers'
import {TestRunsRepository} from '../respository/test-runs.repository'
import {TestRunDBModel} from '../models/test-runs'
import {firestore} from 'firebase-admin'

export class TestRunsService {
  private dataStore = new DataStore()
  private identifier = new IdentifiersModel(this.dataStore)
  private testRunsRepository = new TestRunsRepository(new DataStore())

  getTestRunsByDate(date: string): Promise<TestRunDBModel[]> {
    return this.testRunsRepository.findWhereEqual('testRunDate', date)
  }

  create(testRunDateTime: Date, testRunDate: string): Promise<TestRunDBModel> {
    return this.identifier.getUniqueId('testRun').then((id) => {
      return this.testRunsRepository.add({
        testRunId: `T${id}`,
        testRunDateTime: firestore.Timestamp.fromDate(testRunDateTime),
        testRunDate,
      } as TestRunDBModel)
    })
  }
}
