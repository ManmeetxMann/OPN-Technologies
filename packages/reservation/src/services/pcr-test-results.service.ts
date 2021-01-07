import moment from 'moment'
import DataStore from '../../../common/src/data/datastore'

import {Config} from '../../../common/src/utils/config'
import {AppoinmentService} from './appoinment.service'

import {EmailService} from '../../../common/src/service/messaging/email-service'
import {PdfService} from '../../../common/src/service/reports/pdf'

import {PCRTestResultsRepository} from '../respository/pcr-test-results-repository'

import {
  TestResultsReportingTrackerRepository,
  TestResultsReportingTrackerPCRResultsRepository,
} from '../respository/test-results-reporting-tracker-repository'

import {
  CreateReportForPCRResultsResponse,
  ResultReportStatus,
  PCRTestResultRequest,
  PCRTestResultData,
  PCRResultActions,
  PCRTestResultEmailDTO,
} from '../models/pcr-test-results'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {OPNCloudTasks} from '../../../common/src/service/google/cloud_tasks'
import {ResultTypes} from '../models/appointment'
import testResultPDFTemplate from '../templates/testResult'

export class PCRTestResultsService {
  private datastore = new DataStore()
  private testResultsReportingTracker = new TestResultsReportingTrackerRepository(this.datastore)
  private pcrTestResultsRepository = new PCRTestResultsRepository(this.datastore)
  private appointmentService = new AppoinmentService()
  private emailService = new EmailService()
  private pdfService = new PdfService()

  async createReportForPCRResults(
    testResultData: PCRTestResultRequest,
  ): Promise<CreateReportForPCRResultsResponse> {
    let reportTrackerId: string
    if (!testResultData.reportTrackerId) {
      const reportTracker = await this.testResultsReportingTracker.save()
      reportTrackerId = reportTracker.id
    } else {
      reportTrackerId = testResultData.reportTrackerId
      const reportTracker = await this.testResultsReportingTracker.get(reportTrackerId)
      if (!reportTracker) {
        throw new BadRequestException('Invalid Report Tracker ID')
      }
    }

    const testResultsReportingTrackerPCRResult = new TestResultsReportingTrackerPCRResultsRepository(
      this.datastore,
      reportTrackerId,
    )
    const resultDate = testResultData.resultDate
    const pcrResults = testResultData.results.map((result) => {
      return {
        data: {
          ...result,
          resultDate,
        },
        status: ResultReportStatus.RequestReceived,
      }
    })

    const savedResults = await testResultsReportingTrackerPCRResult.saveAll(pcrResults)

    const taskClient = new OPNCloudTasks('report-results')
    savedResults.map((result) => {
      taskClient.createTask(
        {
          reportTrackerId: reportTrackerId,
          resultId: result.id,
        },
        '/reservation/internal/api/v1/process-pcr-test-result',
      )
    })

    return {
      reportTrackerId: reportTrackerId,
    }
  }

  async processPCRTestResult(reportTrackerId: string, resultId: string): Promise<void> {
    const testResultsReportingTrackerPCRResult = new TestResultsReportingTrackerPCRResultsRepository(
      this.datastore,
      reportTrackerId,
    )

    const pcrResults = await testResultsReportingTrackerPCRResult.get(resultId)
    if (!pcrResults) {
      throw new BadRequestException(`ProcessPCRTestResultFailed: ID: ${resultId} does not exists`)
    }

    if (pcrResults.status !== ResultReportStatus.RequestReceived) {
      //throw new BadRequestException(`ProcessPCRTestResultFailed: ID: ${resultId} BarCode: ${pcrResults.data.barCode} has status ${pcrResults.status}`)
    }

    await testResultsReportingTrackerPCRResult.updateProperty(
      resultId,
      'status',
      ResultReportStatus.Processing,
    )
    await this.handlePCRResultSaveAndSend(pcrResults.data)
  }

  async handlePCRResultSaveAndSend(resultData: PCRTestResultData): Promise<void> {
    let finalResult = resultData.autoResult
    let sendNotification = resultData.notify
    switch (resultData.action) {
      case PCRResultActions.DoNothing: {
        console.log('Nothing')
        break
      }
      case PCRResultActions.ReRunToday: {
        console.log('ReRunToday')
        break
      }
      case PCRResultActions.ReRunTomorrow: {
        console.log('ReRunTomorrow')
        break
      }
      case PCRResultActions.RequestReSample: {
        console.log('RequestReSample')
        break
      }
      case PCRResultActions.MarkAsNegative: {
        finalResult = ResultTypes.Negative
        break
      }
      case PCRResultActions.MarkAsPositive: {
        finalResult = ResultTypes.Positive
        break
      }
      default: {
        sendNotification = true
        break
      }
    }

    const appointment = await this.appointmentService.getAppointmentByBarCode(resultData.barCode)

    //Save PCR Test results
    delete resultData.action
    delete resultData.notify
    const pcrResultDataForDb = {
      ...resultData,
      result: finalResult,
      firstName: appointment.firstName,
      lastName: appointment.lastName,
      appointmentId: appointment.id,
    }
    await this.pcrTestResultsRepository.save(pcrResultDataForDb)

    const pcrResultDataForEmail = {
      ...pcrResultDataForDb,
      email: appointment.email,
      phone: appointment.phone,
      dateOfBirth: appointment.dateOfBirth,
      dateTime: appointment.dateTime,
      dateOfAppointment: appointment.dateOfAppointment,
      timeOfAppointment: appointment.timeOfAppointment,
      registeredNursePractitioner: appointment.registeredNursePractitioner,
    }
    if (sendNotification) {
      await this.sendTestResults(pcrResultDataForEmail)
    }
  }

  async sendTestResults(testResults: PCRTestResultEmailDTO): Promise<void> {
    const resultDate = moment(testResults.resultDate).format('LL')

    const {content, tableLayouts} = testResultPDFTemplate(testResults, resultDate)
    const pdfContent = await this.pdfService.generatePDFBase64(content, tableLayouts)

    this.emailService.send({
      templateId: (Config.getInt('TEST_RESULT_EMAIL_TEMPLATE_ID') ?? 2) as number,
      to: [{email: testResults.email, name: `${testResults.firstName} ${testResults.lastName}`}],
      params: {
        BARCODE: testResults.barCode,
        DATE_OF_RESULT: resultDate,
      },
      attachment: [
        {
          content: pdfContent,
          name: `FHHealth.ca Result - ${testResults.barCode} - ${resultDate}.pdf`,
        },
      ],
      bcc: [
        {
          email: Config.get('TEST_RESULT_BCC_EMAIL'),
        },
      ],
    })
  }
}
