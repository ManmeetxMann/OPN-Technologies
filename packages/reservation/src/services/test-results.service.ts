import DataStore from '../../../common/src/data/datastore'

import {TestResultsDTOForEmail, TestResultsDBModel} from '../models/appoinment'
import {TestResultsDBRepository} from '../respository/test-results-db.repository'

export class TestResultsService {
  private testResultsDBRepository = new TestResultsDBRepository(new DataStore())

  async sendTestResults(testResults: TestResultsDTOForEmail): Promise<void> {
    //This is Placeholder for Calling Function create PDF and send as Email
    console.log(testResults)
  }

  async saveResults(testResults: TestResultsDBModel): Promise<void> {
    this.testResultsDBRepository.save(testResults)
  }

  async resultAlreadySent(barCode: string): Promise<boolean> {
    const testResultExists = this.testResultsDBRepository.get(barCode).then((testResults) => {
      return !!testResults
    })
    return testResultExists
  }

  async getResults(barCode: string): Promise<TestResultsDBModel> {
    return this.testResultsDBRepository.get(barCode)
  }
}
