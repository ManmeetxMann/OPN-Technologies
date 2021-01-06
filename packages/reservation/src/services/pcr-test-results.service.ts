import {TestResultsReportingTrackerRepository, TestResultsReportingTrackerPCRResultsRepository} from '../respository/report-pcr-test-results-repository'

import DataStore from '../../../common/src/data/datastore'
import { PCRTestResultRequest } from '../models/pcr-test-results'
import {ResultReportStatus} from '../models/test-results-reporting'

export class PCRTestResultsService {
  private datastore = new DataStore()
  private testResultsReportingTracker = new TestResultsReportingTrackerRepository(this.datastore)

  async createReportForPCRResults(testResultData: PCRTestResultRequest): Promise<void> {
    const reportTracker = await this.testResultsReportingTracker.save()
    
    const testResultsReportingTrackerPCRResult = new TestResultsReportingTrackerPCRResultsRepository(this.datastore, reportTracker.id)
    const resultDate = testResultData.resultDate
    const pcrResults = testResultData.results.map((result) => {

      return {
        data:{
          ...result,
          resultDate
        },
        status: ResultReportStatus.RequestReceived
      }
    })
    testResultsReportingTrackerPCRResult.saveAll(pcrResults)
  }

}
