import moment from 'moment'
import DataStore from '../../../common/src/data/datastore'

import {Config} from '../../../common/src/utils/config'
import {AppoinmentService} from './appoinment.service'
import {CouponService} from './coupon.service'

import {EmailService} from '../../../common/src/service/messaging/email-service'
import {PdfService} from '../../../common/src/service/reports/pdf'

import {PCRTestResultsRepository} from '../respository/pcr-test-results-repository'

import {
  TestResultsReportingTrackerPCRResultsRepository,
  TestResultsReportingTrackerRepository,
} from '../respository/test-results-reporting-tracker-repository'

import {
  AppointmentDataDTO,
  CreateReportForPCRResultsResponse,
  PCRResultActions,
  PCRTestResultData,
  PCRTestResultDBModel,
  PCRTestResultEmailDTO,
  PCRTestResultRequest,
  ResultReportStatus,
  TestResultsReportingTrackerPCRResultsDBModel,
} from '../models/pcr-test-results'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {OPNCloudTasks} from '../../../common/src/service/google/cloud_tasks'
import testResultPDFTemplate from '../templates/pcrTestResult'
import {ResultTypes} from '../models/appointment'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {DataModelFieldMapOperatorType} from '../../../common/src/data/datamodel.base'
import {dateFormats} from '../../../common/src/utils/times'

export class PCRTestResultsService {
  private datastore = new DataStore()
  private testResultsReportingTracker = new TestResultsReportingTrackerRepository(this.datastore)
  private pcrTestResultsRepository = new PCRTestResultsRepository(this.datastore)
  private appointmentService = new AppoinmentService()
  private couponService = new CouponService()
  private emailService = new EmailService()
  private pdfService = new PdfService()
  private couponCode: string

  async createReportForPCRResults(
    testResultData: PCRTestResultRequest,
    adminId: string,
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
        adminId: adminId,
      }
    })

    const savedResults = await testResultsReportingTrackerPCRResult.saveAll(pcrResults)

    const taskClient = new OPNCloudTasks('report-results')
    savedResults.map(async (result) => {
      await taskClient.createTask(
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
      adminId: pcrResults.adminId,
    })
  }

  async listPCRTestResult(
    reportTrackerId: string,
  ): Promise<TestResultsReportingTrackerPCRResultsDBModel[]> {
    const testResultsReportingTrackerPCRResult = new TestResultsReportingTrackerPCRResultsRepository(
      this.datastore,
      reportTrackerId,
    )

    return testResultsReportingTrackerPCRResult.fetchAll()
  }

  async getPCRResults({
    organizationId,
    dateOfAppointment,
  }: {
    organizationId: string
    dateOfAppointment: string
  }): Promise<PCRTestResultDBModel[]> {
    const pcrTestResultsQuery = [
      {
        map: '/',
        key: 'dateOfAppointment',
        operator: DataModelFieldMapOperatorType.Equals,
        value: moment(dateOfAppointment).format(dateFormats.longMonth),
      },
    ]
    if (organizationId) {
      pcrTestResultsQuery.push({
        map: '/',
        key: 'organizationId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: organizationId,
      })
    }
    return this.pcrTestResultsRepository.findWhereEqualInMap(pcrTestResultsQuery)
  }

  async getTestResultsByAppointmentId(appointmentId: string): Promise<PCRTestResultDBModel> {
    const pcrTestResults = await this.pcrTestResultsRepository.findWhereEqual(
      'appointmentId',
      appointmentId,
    )

    if (!pcrTestResults || pcrTestResults.length == 0) {
      throw new ResourceNotFoundException(
        `PCRTestResult with appointment ${appointmentId} not found`,
      )
    }

    if (pcrTestResults.length > 1) {
      console.log(
        `GetTestResultsByAppointmentId: Multiple test results found with Appointment Id: ${appointmentId} `,
      )
    }

    return pcrTestResults[0]
  }

  async getWaitingPCRResultsByAppointmentId(appointmentId: string): Promise<PCRTestResultDBModel> {
    const pcrTestResultsQuery = [
      {
        map: '/',
        key: 'appointmentId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: appointmentId,
      },
      {
        map: '/',
        key: 'waitingResult',
        operator: DataModelFieldMapOperatorType.Equals,
        value: true,
      },
    ]
    const pcrTestResults = await this.pcrTestResultsRepository.findWhereEqualInMap(
      pcrTestResultsQuery,
    )

    if (!pcrTestResults || pcrTestResults.length == 0) {
      throw new ResourceNotFoundException(
        `PCRTestResult with appointment ${appointmentId} not found`,
      )
    }

    if (pcrTestResults.length > 1) {
      console.log(
        `GetTestResultsByAppointmentId: Multiple test results found with Appointment Id: ${appointmentId} `,
      )
    }

    return pcrTestResults[0]
  }

  getFinalResult(action: PCRResultActions, autoResult: ResultTypes, barCode: string): ResultTypes {
    let finalResult = autoResult
    switch (action) {
      case PCRResultActions.RequestReSample: {
        console.log(`TestResultOverwrittten: ${barCode} is marked as Negative`)
        finalResult = ResultTypes.ReSampleRequested
        break
      }
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

  async getTestResultByBarCode(barCodeNumber: string): Promise<PCRTestResultDBModel> {
    const pcrTestResults = await this.pcrTestResultsRepository.findWhereEqual(
      'barCode',
      barCodeNumber,
    )

    if (!pcrTestResults || pcrTestResults.length == 0) {
      throw new ResourceNotFoundException(`PCRTestResult with barCode ${barCodeNumber} not found`)
    }
    const pcrTestResult = pcrTestResults.filter((result) => result.waitingResult)
    if (!pcrTestResult || pcrTestResult.length == 0) {
      throw new ResourceNotFoundException(`No Results are waiting for barcode: ${barCodeNumber}`)
    }
    //Only one Result should be waiting
    return pcrTestResult[0]
  }

  async getReSampledTestResultByBarCode(barCodeNumber: string): Promise<PCRTestResultDBModel> {
    const pcrTestResultsQuery = [
      {
        map: '/',
        key: 'barCode',
        operator: DataModelFieldMapOperatorType.Equals,
        value: barCodeNumber,
      },
      {
        map: '/',
        key: 'result',
        operator: DataModelFieldMapOperatorType.Equals,
        value: ResultTypes.ReSampleRequested,
      },
    ]
    const pcrTestResults = await this.pcrTestResultsRepository.findWhereEqualInMap(
      pcrTestResultsQuery,
    )

    if (!pcrTestResults || pcrTestResults.length == 0) {
      throw new ResourceNotFoundException(
        `PCRTestResult with barCode ${barCodeNumber} and ReSample Requested not found`,
      )
    }

    //Only one Result should be waiting
    return pcrTestResults[0]
  }

  async handlePCRResultSaveAndSend(resultData: PCRTestResultData): Promise<void> {
    const finalResult = this.getFinalResult(
      resultData.resultSpecs.action,
      resultData.resultSpecs.autoResult,
      resultData.barCode,
    )
    const appointment = await this.appointmentService.getAppointmentByBarCode(resultData.barCode)
    const testResult = await this.getTestResultByBarCode(resultData.barCode)

    await this.handleActions(resultData, {
      id: appointment.id,
      organizationId: appointment.organizationId,
      email: appointment.email,
    })

    //Save PCR Test results
    const pcrResultDataForDb = {
      ...resultData,
      result: finalResult,
      firstName: appointment.firstName,
      lastName: appointment.lastName,
      appointmentId: appointment.id,
      organizationId: appointment.organizationId,
      dateOfAppointment: appointment.dateOfAppointment,
      waitingResult: false,
      displayForNonAdmins: true,
    }

    await this.pcrTestResultsRepository.updateProperties(testResult.id, pcrResultDataForDb)
    //await this.pcrTestResultsRepository.save(pcrResultDataForDb)

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
      await this.sendNotification(pcrResultDataForEmail)
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
        await this.sendReSampleNotification(resultData)
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

    await this.emailService.send({
      templateId: Config.getInt('TEST_RESULT_EMAIL_TEMPLATE_ID') ?? 2,
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
    await this.emailService.send({
      templateId: Config.getInt('TEST_RESULT_RERUN_NOTIFICATION_TEMPLATE_ID') ?? 4,
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

  async sendReSampleNotification(resultData: PCRTestResultEmailDTO): Promise<void> {
    const appointmentBookingBaseURL = Config.get('ACUITY_CALENDAR_URL')
    const owner = Config.get('ACUITY_SCHEDULER_USERNAME')
    const appointmentBookingLink = `${appointmentBookingBaseURL}?owner=${owner}&certificate=${this.couponCode}`
    const templateId = resultData.organizationId
      ? Config.getInt('TEST_RESULT_ORG_RESAMPLE_NOTIFICATION_TEMPLATE_ID') ?? 6
      : Config.getInt('TEST_RESULT_NO_ORG_RESAMPLE_NOTIFICATION_TEMPLATE_ID') ?? 5

    await this.emailService.send({
      templateId: templateId,
      to: [{email: resultData.email, name: `${resultData.firstName} ${resultData.lastName}`}],
      params: {
        COUPON_CODE: this.couponCode,
        BOOKING_LINK: appointmentBookingLink,
      },
      bcc: [
        {
          email: Config.get('TEST_RESULT_BCC_EMAIL'),
        },
      ],
    })
  }

  async handleActions(
    resultData: PCRTestResultData,
    appointment: AppointmentDataDTO,
  ): Promise<void> {
    switch (resultData.resultSpecs.action) {
      case PCRResultActions.ReRunToday: {
        console.log(`TestResultReRun: ${resultData.barCode} is added to queue for today`)
        await this.appointmentService.changeStatusToReRunRequired(
          appointment.id,
          true,
          resultData.adminId,
        )
        break
      }
      case PCRResultActions.ReRunTomorrow: {
        console.log(`TestResultReRun: ${resultData.barCode} is added to queue for tomorrow`)
        await this.appointmentService.changeStatusToReRunRequired(
          appointment.id,
          false,
          resultData.adminId,
        )
        break
      }
      case PCRResultActions.RequestReSample: {
        console.log(`TestResultReSample: ${resultData.barCode} is requested`)
        await this.appointmentService.changeStatusToReSampleRequired(
          appointment.id,
          resultData.adminId,
        )
        this.couponCode = await this.couponService.createCoupon(appointment.email)
        console.log(
          `TestResultReSample: CouponCode ${this.couponCode} is created for ${appointment.email} ResampledBarCode: ${resultData.barCode}`,
        )
        await this.couponService.saveCoupon(
          this.couponCode,
          appointment.organizationId,
          resultData.barCode,
        )
        break
      }
    }
  }

  async deleteTestResults(id: string): Promise<void> {
    await this.pcrTestResultsRepository.delete(id)
  }

  async updateDefaultTestResults(
    id: string,
    defaultTestResults: Partial<PCRTestResultDBModel>,
  ): Promise<void> {
    await this.pcrTestResultsRepository.updateProperties(id, defaultTestResults)
  }

  async saveDefaultTestResults(
    defaultTestResults: Omit<PCRTestResultDBModel, 'id'>,
  ): Promise<void> {
    await this.pcrTestResultsRepository.save(defaultTestResults)
  }

  async getPCRTestsByBarcode(barCodes: string[]): Promise<PCRTestResultDBModel[]> {
    return this.pcrTestResultsRepository.findWhereIn('barCode', barCodes)
  }

  async updateOrganizationIdByAppointmentId(
    appointmentId: string,
    organizationId: string,
  ): Promise<void> {
    const {id} = await this.getTestResultsByAppointmentId(appointmentId)

    await this.pcrTestResultsRepository.updateProperties(id, {organizationId})
  }
}
