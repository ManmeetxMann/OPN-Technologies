import {TestResultsReportingTrackerRepository, TestResultsReportingTrackerPCRResultsRepository} from '../respository/report-pcr-test-results-repository'

import DataStore from '../../../common/src/data/datastore'
import { PCRTestResultRequest } from '../models/pcr-test-results'
import {CreateReportForPCRResultsResponse, ResultReportStatus} from '../models/test-results-reporting'
import { BadRequestException } from '../../../common/src/exceptions/bad-request-exception'
import {OPNCloudTasks} from '../../../common/src/service/google/cloud_tasks'

export class PCRTestResultsService {
	private datastore = new DataStore()
	private testResultsReportingTracker = new TestResultsReportingTrackerRepository(this.datastore)

	async createReportForPCRResults(testResultData: PCRTestResultRequest): Promise<CreateReportForPCRResultsResponse> {
		let reportTrackerId:string;
		if(!testResultData.reportTrackerId){
			const reportTracker = await this.testResultsReportingTracker.save()
			reportTrackerId = reportTracker.id
		}else{
			reportTrackerId = testResultData.reportTrackerId
			const reportTracker = await this.testResultsReportingTracker.get(reportTrackerId)
			if(!reportTracker){
				throw new BadRequestException('Invalid Report Tracker ID')
			}
		}

		const testResultsReportingTrackerPCRResult = new TestResultsReportingTrackerPCRResultsRepository(this.datastore, reportTrackerId)
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
		await testResultsReportingTrackerPCRResult.saveAll(pcrResults)

		const taskClient = new OPNCloudTasks('report-results')
		taskClient.createTask({reportTrackerId:reportTrackerId}, '/internal/process-pcr-test-results')

		return {
			reportTrackerId: reportTrackerId
		}
	}

}
