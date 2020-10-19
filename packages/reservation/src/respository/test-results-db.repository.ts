import {TestResultsDBModel} from '../models/appoinment'
import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'

export class TestResultsDBRepository extends DataModel<TestResultsDBModel> {
  public rootPath = 'test-results'
  readonly zeroSet = []
  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  public async save(testResults: TestResultsDBModel): Promise<void> {
    this.add(testResults)
  }
}
