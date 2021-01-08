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
import testResultPDFTemplate from '../templates/pcrTestResult'
import {ResultTypes} from '../models/appointment'

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
    await this.handlePCRResultSaveAndSend({
      barCode: pcrResults.data.barCode,
      resultSpecs: pcrResults.data,
    })
  }

  getFinalResult(action: PCRResultActions, autoResult: ResultTypes, barCode: string): ResultTypes {
    let finalResult = autoResult
    switch (action) {
      case PCRResultActions.MarkAsNegative: {
        console.log(`TestResultOverwrittten: ${barCode} is marked as Negative`)
        finalResult = ResultTypes.Negative
        break
      }
      case PCRResultActions.MarkAsPositive: {
        console.log(`TestResultOverwrittten: ${barCode} is marked as Positive`)
        finalResult = ResultTypes.Positive
        break
      }
    }
    return finalResult
  }

  async handlePCRResultSaveAndSend(resultData: PCRTestResultData): Promise<void> {
    const finalResult = this.getFinalResult(
      resultData.resultSpecs.action,
      resultData.resultSpecs.autoResult,
      resultData.barCode,
    )
    const appointment = await this.appointmentService.getAppointmentByBarCode(resultData.barCode)

    await this.updateAppointmentStatus(resultData, appointment.id)

    //Save PCR Test results
    const pcrResultDataForDb = {
      ...resultData,
      result: finalResult,
      firstName: appointment.firstName,
      lastName: appointment.lastName,
      appointmentId: appointment.id,
      organizationId: appointment.organizationId,
      dateOfAppointment: appointment.dateOfAppointment,
    }
    await this.pcrTestResultsRepository.save(pcrResultDataForDb)

    //Send Notification
    if (resultData.resultSpecs.notify) {
      const pcrResultDataForEmail = {
        ...pcrResultDataForDb,
        email: appointment.email,
        phone: appointment.phone,
        dateOfBirth: appointment.dateOfBirth,
        dateTime: appointment.dateTime,
        timeOfAppointment: appointment.timeOfAppointment,
        registeredNursePractitioner: appointment.registeredNursePractitioner,
      }
      this.sendNotification(pcrResultDataForEmail)
    }
  }

  async sendNotification(resultData: PCRTestResultEmailDTO): Promise<void> {
    switch (resultData.resultSpecs.action) {
      case PCRResultActions.ReRunToday: {
        console.log(`SendNotification: ${resultData.barCode} ReRunToday`)
        await this.sendRerunNotification(resultData, 'TODAY')
        break
      }
      case PCRResultActions.ReRunTomorrow: {
        console.log(`SendNotification: ${resultData.barCode} ReRunTomorrow`)
        await this.sendRerunNotification(resultData, 'Tomorrow')
        break
      }
      case PCRResultActions.RequestReSample: {
        console.log(`SendNotification: ${resultData.barCode} RequestReSample`)
        //await this.sendReSampleNotification(resultData, 'H7KSSSGH6')
        const appointmentBookingBaseURL = Config.get('ACUITY_CALENDAR_URL')
        console.log(appointmentBookingBaseURL)
        break
      }
      default: {
        await this.sendTestResults(resultData)
      }
    }
  }

  async sendTestResults(resultData: PCRTestResultEmailDTO): Promise<void> {
    const resultDate = moment(resultData.resultSpecs.resultDate).format('LL')
    const {content, tableLayouts} = testResultPDFTemplate(resultData, resultDate)
    const pdfContent = await this.pdfService.generatePDFBase64(content, tableLayouts)

    this.emailService.send({
      templateId: (Config.getInt('TEST_RESULT_EMAIL_TEMPLATE_ID') ?? 2) as number,
      to: [{email: resultData.email, name: `${resultData.firstName} ${resultData.lastName}`}],
      params: {
        BARCODE: resultData.barCode,
        DATE_OF_RESULT: resultDate,
      },
      attachment: [
        {
          content: pdfContent,
          name: `FHHealth.ca Result - ${resultData.barCode} - ${resultDate}.pdf`,
        },
      ],
      bcc: [
        {
          email: Config.get('TEST_RESULT_BCC_EMAIL'),
        },
      ],
    })
  }

  async sendRerunNotification(resultData: PCRTestResultEmailDTO, day: string): Promise<void> {
    this.emailService.send({
      templateId: (Config.getInt('TEST_RESULT_RERUN_NOTIFICATION_TEMPLATE_ID') ?? 4) as number,
      to: [{email: resultData.email, name: `${resultData.firstName} ${resultData.lastName}`}],
      params: {
        DAY: day,
      },
      bcc: [
        {
          email: Config.get('TEST_RESULT_BCC_EMAIL'),
        },
      ],
    })
  }

  async sendReSampleNotification(
    resultData: PCRTestResultEmailDTO,
    packageCode: string,
  ): Promise<void> {
    this.emailService.send({
      templateId: (Config.getInt('TEST_RESULT_RERUN_NOTIFICATION_TEMPLATE_ID') ?? 5) as number,
      to: [{email: resultData.email, name: `${resultData.firstName} ${resultData.lastName}`}],
      params: {
        PACKAGE_CODE: packageCode,
      },
      bcc: [
        {
          email: Config.get('TEST_RESULT_BCC_EMAIL'),
        },
      ],
    })
  }

  async updateAppointmentStatus(
    resultData: PCRTestResultData,
    appointmentId: string,
  ): Promise<void> {
    switch (resultData.resultSpecs.action) {
      case PCRResultActions.ReRunToday: {
        console.log(`TestResultReRun: ${resultData.barCode} is added to queue for today`)
        await this.appointmentService.changeStatusToReRunRequired(appointmentId, true)
        break
      }
      case PCRResultActions.ReRunTomorrow: {
        console.log(`TestResultReRun: ${resultData.barCode} is added to queue for tomorrow`)
        await this.appointmentService.changeStatusToReRunRequired(appointmentId, false)
        break
      }
      case PCRResultActions.RequestReSample: {
        console.log(`TestResultReSample: ${resultData.barCode} is requested`)
        await this.appointmentService.changeStatusToReSampleRequired(appointmentId)
        break
      }
    }
  }
}
