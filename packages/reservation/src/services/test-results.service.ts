import DataStore from '../../../common/src/data/datastore'

import {TestResultsDTOForEmail} from '../models/appoinment'
import {TestResultsDBRepository} from '../respository/test-results-db.repository'

export class TestResultsService {
  private testResultsDBRepository = new TestResultsDBRepository(new DataStore())

  async sendTestResults(testResults: TestResultsDTOForEmail): Promise<void> {
    console.log(testResults)
  }
}
