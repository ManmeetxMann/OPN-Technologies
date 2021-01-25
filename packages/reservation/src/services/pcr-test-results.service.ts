import moment from 'moment'

import DataStore from '../../../common/src/data/datastore'
import {Config} from '../../../common/src/utils/config'
import {EmailService} from '../../../common/src/service/messaging/email-service'
import {PdfService} from '../../../common/src/service/reports/pdf'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {DataModelFieldMapOperatorType} from '../../../common/src/data/datamodel.base'
import {dateFormats} from '../../../common/src/utils/times'
import {toDateFormat} from '../../../common/src/utils/times'
import {OPNCloudTasks} from '../../../common/src/service/google/cloud_tasks'

import {AppoinmentService} from './appoinment.service'
import {CouponService} from './coupon.service'

import {PCRTestResultsRepository} from '../respository/pcr-test-results-repository'
import {
  TestResultsReportingTrackerPCRResultsRepository,
  TestResultsReportingTrackerRepository,
} from '../respository/test-results-reporting-tracker-repository'

import {
  CreateReportForPCRResultsResponse,
  PCRResultActions,
  PCRTestResultData,
  PCRTestResultDBModel,
  PCRTestResultEmailDTO,
  PCRTestResultLinkedDBModel,
  PCRTestResultListDTO,
  PCRTestResultRequest,
  PcrTestResultsListRequest,
  ResultReportStatus,
  TestResultsReportingTrackerPCRResultsDBModel,
  PCRResultActionsAllowedResend,
} from '../models/pcr-test-results'

import {
  AppointmentDBModel,
  AppointmentReasons,
  AppointmentStatus,
  DeadlineLabel,
  ResultTypes,
} from '../models/appointment'

import testResultPDFTemplate from '../templates/pcrTestResult'
import {makeDeadline} from '../utils/datetime.helper'
import {ResultAlreadySentException} from '../exceptions/result_already_sent'

export class PCRTestResultsService {
  private datastore = new DataStore()
  private testResultsReportingTracker = new TestResultsReportingTrackerRepository(this.datastore)
  private pcrTestResultsRepository = new PCRTestResultsRepository(this.datastore)
  private appointmentService = new AppoinmentService()
  private couponService = new CouponService()
  private emailService = new EmailService()
  private pdfService = new PdfService()
  private couponCode: string
  private whiteListedResultsForNotification = [ResultTypes.Negative, ResultTypes.Positive]

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

  async deleteTestResults(id: string): Promise<void> {
    await this.pcrTestResultsRepository.delete(id)
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
    try {
      await this.handlePCRResultSaveAndSend(
        {
          barCode: pcrResults.data.barCode,
          resultSpecs: pcrResults.data,
          adminId: pcrResults.adminId,
        },
        false,
        false,
      )
      if (pcrResults.data.action === PCRResultActions.DoNothing) {
        await testResultsReportingTrackerPCRResult.updateProperty(
          resultId,
          'status',
          ResultReportStatus.RequestIgnoredAsPerRequest,
        )
      } else {
        await testResultsReportingTrackerPCRResult.updateProperty(
          resultId,
          'status',
          ResultReportStatus.SuccessfullyReported,
        )
      }
    } catch (error) {
      //CRITICAL
      console.error(`processPCRTestResult: handlePCRResultSaveAndSend Failed ${error} `)
      await testResultsReportingTrackerPCRResult.updateProperties(resultId, {
        status: ResultReportStatus.Failed,
        details: error.toString(),
      })
    }
  }

  async listPCRTestResultReportStatus(
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
    deadline,
    testRunId,
    barCode,
  }: PcrTestResultsListRequest): Promise<PCRTestResultListDTO[]> {
    const pcrTestResultsQuery = []

    if (dateOfAppointment) {
      pcrTestResultsQuery.push({
        map: '/',
        key: 'dateOfAppointment',
        operator: DataModelFieldMapOperatorType.Equals,
        value: moment(dateOfAppointment).format(dateFormats.longMonth),
      })
    }

    if (organizationId) {
      pcrTestResultsQuery.push({
        map: '/',
        key: 'organizationId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: organizationId,
      })
    }

    if (deadline) {
      const deadlineFormatted = makeDeadline(moment(deadline))
      pcrTestResultsQuery.push({
        map: '/',
        key: 'deadline',
        operator: DataModelFieldMapOperatorType.Equals,
        value: deadlineFormatted,
      })
    }

    if (testRunId) {
      pcrTestResultsQuery.push({
        map: '/',
        key: 'testRunId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: testRunId,
      })
    }

    if (barCode) {
      pcrTestResultsQuery.push({
        map: '/',
        key: 'barCode',
        operator: DataModelFieldMapOperatorType.Equals,
        value: barCode,
      })
    }

    const pcrResults = await this.pcrTestResultsRepository.findWhereEqualInMap(pcrTestResultsQuery)

    let appointments
    if (deadline || testRunId || barCode) {
      const appointmentIds = pcrResults.map(({appointmentId}) => appointmentId)
      appointments = await this.appointmentService.getAppointmentsDBByIds(appointmentIds)
    }

    return pcrResults.map((pcr) => {
      const appointment = appointments?.find(({id}) => pcr.appointmentId === id)

      return {
        id: pcr.id,
        barCode: pcr.barCode,
        result: pcr.result,
        vialLocation: appointment?.vialLocation,
        status: appointment?.appointmentStatus,
        dateTime: appointment?.dateTime,
        deadline: pcr.deadline,
        testRunId: pcr.testRunId,
        firstName: pcr.firstName,
        lastName: pcr.lastName,
        testType: 'PCR',
        dateOfAppointment: pcr.dateOfAppointment,
      }
    })
  }

  async getTestResultsByAppointmentId(appointmentId: string): Promise<PCRTestResultDBModel[]> {
    const pcrTestResults = await this.pcrTestResultsRepository.findWhereEqual(
      'appointmentId',
      appointmentId,
    )

    if (!pcrTestResults || pcrTestResults.length === 0) {
      throw new ResourceNotFoundException(
        `PCRTestResult with appointment ${appointmentId} not found`,
      )
    }

    return pcrTestResults
  }

  async getWaitingPCRResultsByAppointmentId(appointmentId: string): Promise<PCRTestResultDBModel> {
    const pcrTestResults = await this.pcrTestResultsRepository.getWaitingPCRResultsByAppointmentId(
      appointmentId,
    )

    if (!pcrTestResults || pcrTestResults.length === 0) {
      throw new ResourceNotFoundException(
        `PCRTestResult with appointment ${appointmentId} not found`,
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

  async getPCRResultsByByBarCode(barCodeNumber: string): Promise<PCRTestResultDBModel[]> {
    const pcrTestResults = await this.pcrTestResultsRepository.findWhereEqualWithMax(
      'barCode',
      barCodeNumber,
      'updatedAt',
    )
    if (!pcrTestResults || pcrTestResults.length === 0) {
      throw new ResourceNotFoundException(`PCRTestResult with barCode ${barCodeNumber} not found`)
    }
    return pcrTestResults
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

    if (!pcrTestResults || pcrTestResults.length === 0) {
      throw new ResourceNotFoundException(
        `PCRTestResult with barCode ${barCodeNumber} and ReSample Requested not found`,
      )
    }

    //Only one Result should be waiting
    return pcrTestResults[0]
  }

  async getWaitingPCRTestResult(
    pcrTestResults: PCRTestResultDBModel[],
  ): Promise<PCRTestResultDBModel> {
    const pcrWaitingTestResult = pcrTestResults.filter((result) => result.waitingResult)
    return pcrWaitingTestResult && pcrWaitingTestResult.length !== 0
      ? pcrWaitingTestResult[0]
      : undefined
  }

  async getLatestPCRTestResult(
    pcrTestResults: PCRTestResultDBModel[],
  ): Promise<PCRTestResultDBModel> {
    return pcrTestResults.reduce(function (lastPCRResult, pcrResult) {
      return lastPCRResult.updatedAt < pcrResult.updatedAt ? lastPCRResult : pcrResult
    }, pcrTestResults[0])
  }

  allowedForResend(action: PCRResultActions): boolean {
    if (action in PCRResultActionsAllowedResend) {
      return true
    }
    return false
  }

  async handlePCRResultSaveAndSend(
    resultData: PCRTestResultData,
    isSingleResult: boolean,
    sendUpdatedResults: boolean,
  ): Promise<PCRTestResultDBModel> {
    if (resultData.resultSpecs.action === PCRResultActions.DoNothing) {
      console.log(
        `handlePCRResultSaveAndSend: DoNothing is selected for ${resultData.barCode}. It is Ignored`,
      )
      return
    }

    const appointment = await this.appointmentService.getAppointmentByBarCode(resultData.barCode)
    const pcrTestResults = await this.getPCRResultsByByBarCode(resultData.barCode)

    const waitingPCRTestResult = await this.getWaitingPCRTestResult(pcrTestResults)
    const isAlreadyReported = appointment.appointmentStatus === AppointmentStatus.Reported
    const inProgress = appointment.appointmentStatus === AppointmentStatus.InProgress
    const finalResult = this.getFinalResult(
      resultData.resultSpecs.action,
      resultData.resultSpecs.autoResult,
      resultData.barCode,
    )

    if (
      !this.whiteListedResultsForNotification.includes(finalResult) &&
      resultData.resultSpecs.action === PCRResultActions.SendThisResult
    ) {
      console.error(
        `handlePCRResultSaveAndSend: Failed Barcode: ${resultData.barCode} SendThisResult action is not allowed for result ${finalResult} is not allowed`,
      )
      throw new BadRequestException(
        `Barcode: ${resultData.barCode} not allowed use action SendThisResult for ${finalResult} Results`,
      )
    }

    if (!waitingPCRTestResult && (!isSingleResult || !isAlreadyReported)) {
      console.error(
        `handlePCRResultSaveAndSend: FailedToSend NotWaitingForResults SingleResult: ${isSingleResult} Current Appointment Status: ${appointment.appointmentStatus}`,
      )
      throw new ResourceNotFoundException(
        `PCR Test Result with barCode ${resultData.barCode} is not waiting for results.`,
      )
    }

    if (
      !waitingPCRTestResult &&
      isSingleResult &&
      isAlreadyReported &&
      !this.allowedForResend(resultData.resultSpecs.action)
    ) {
      console.error(
        `handlePCRResultSaveAndSend: FailedToSend Already Reported not allowed to do Action: ${resultData.resultSpecs.action}`,
      )
      throw new BadRequestException(
        `PCR Test Result with barCode ${resultData.barCode} is already Reported. It is not allowed to do ${resultData.resultSpecs.action} `,
      )
    }

    if (!waitingPCRTestResult && isSingleResult && isAlreadyReported && !sendUpdatedResults) {
      const latestPCRTestResult = await this.getLatestPCRTestResult(pcrTestResults)
      console.info(
        `handlePCRResultSaveAndSend: SendUpdatedResult Flag Requested PCR Result ID ${latestPCRTestResult.id} Already Exists`,
      )
      throw new ResultAlreadySentException(
        `For ${latestPCRTestResult.barCode}, a "${
          latestPCRTestResult.result
        }" result has already been sent on ${toDateFormat(
          latestPCRTestResult.updatedAt,
        )}. Do you wish to save updated results and send again to client?`,
      )
    }

    if (waitingPCRTestResult && !inProgress) {
      console.error(
        `handlePCRResultSaveAndSend: Failed PCRResultID ${waitingPCRTestResult.id} Barcode: ${resultData.barCode} is not inProgress`,
      )
      throw new BadRequestException(
        `PCR Test Result with barCode ${resultData.barCode} is not InProgress`,
      )
    }

    //Create New Waiting Result for Resend
    const runNumber = 0 //Not Relevant for Resend
    const reSampleNumber = 0 //Not Relevant for Resend
    const testResult =
      isSingleResult && !waitingPCRTestResult
        ? await this.createNewWaitingResult(
            appointment,
            resultData.adminId,
            runNumber,
            reSampleNumber,
          )
        : waitingPCRTestResult

    await this.handleActions(
      resultData,
      appointment,
      testResult.runNumber,
      testResult.reSampleNumber,
    )

    //Update PCR Test results
    const pcrResultDataForDbUpdate = {
      ...resultData,
      result: finalResult,
      firstName: appointment.firstName,
      lastName: appointment.lastName,
      appointmentId: appointment.id,
      organizationId: appointment.organizationId,
      dateOfAppointment: appointment.dateOfAppointment,
      waitingResult: false,
      displayForNonAdmins: true, //TODO
    }

    const pcrResultRecorded = await this.pcrTestResultsRepository.updateData(
      testResult.id,
      pcrResultDataForDbUpdate,
    )

    //Send Notification
    if (resultData.resultSpecs.notify) {
      const pcrResultDataForEmail = {
        ...pcrResultDataForDbUpdate,
        email: appointment.email,
        phone: appointment.phone,
        dateOfBirth: appointment.dateOfBirth,
        dateTime: appointment.dateTime,
        timeOfAppointment: appointment.timeOfAppointment,
        registeredNursePractitioner: appointment.registeredNursePractitioner,
      }
      await this.sendNotification(pcrResultDataForEmail)
    } else {
      console.log(
        `handlePCRResultSaveAndSend: Not Notification is sent for ${resultData.barCode}. Notify is off.`,
      )
    }

    return pcrResultRecorded
  }

  async createNewWaitingResult(
    appointment: AppointmentDBModel,
    adminId: string,
    runNumber: number,
    reSampleNumber: number,
  ): Promise<PCRTestResultDBModel> {
    const pcrResultDataForDbCreate = {
      adminId: adminId,
      appointmentId: appointment.id,
      barCode: appointment.barCode,
      dateOfAppointment: appointment.dateOfAppointment,
      displayForNonAdmins: true,
      deadline: appointment.deadline,
      firstName: appointment.firstName,
      lastName: appointment.lastName,
      linkedBarCodes: [],
      organizationId: appointment.organizationId,
      result: ResultTypes.Pending,
      waitingResult: true,
      runNumber: runNumber,
      reSampleNumber: reSampleNumber,
    }
    return await this.saveDefaultTestResults(pcrResultDataForDbCreate)
  }

  async handleActions(
    resultData: PCRTestResultData,
    appointment: AppointmentDBModel,
    runNumber: number,
    reSampleNumber: number,
  ): Promise<void> {
    const nextRunNumber = runNumber + 1
    switch (resultData.resultSpecs.action) {
      case PCRResultActions.ReRunToday: {
        console.log(`TestResultReRun: for ${resultData.barCode} is added to queue for today`)
        const updatedAppointment = await this.appointmentService.changeStatusToReRunRequired({
          appointment: appointment,
          deadlineLabel: DeadlineLabel.SameDay,
          userId: resultData.adminId,
        })
        await this.createNewWaitingResult(
          updatedAppointment,
          resultData.adminId,
          nextRunNumber,
          reSampleNumber,
        )
        break
      }
      case PCRResultActions.ReRunTomorrow: {
        console.log(`TestResultReRun: for ${resultData.barCode} is added to queue for tomorrow`)
        const updatedAppointment = await this.appointmentService.changeStatusToReRunRequired({
          appointment: appointment,
          deadlineLabel: DeadlineLabel.NextDay,
          userId: resultData.adminId,
        })
        await this.createNewWaitingResult(
          updatedAppointment,
          resultData.adminId,
          nextRunNumber,
          reSampleNumber,
        )
        break
      }
      case PCRResultActions.RequestReSample: {
        console.log(`TestResultReSample: for ${resultData.barCode} is requested`)
        await this.appointmentService.changeStatusToReSampleRequired(
          appointment.id,
          resultData.adminId,
        )
        if (!appointment.organizationId) {
          this.couponCode = await this.couponService.createCoupon(appointment.email)
          console.log(
            `TestResultReSample: CouponCode ${this.couponCode} is created for ${appointment.email} ResampledBarCode: ${resultData.barCode}`,
          )
          await this.couponService.saveCoupon(
            this.couponCode,
            appointment.organizationId,
            resultData.barCode,
          )
        }
        break
      }
      default: {
        console.log(`${resultData.resultSpecs.action}: for ${resultData.barCode} is requested`)
        await this.appointmentService.changeStatusToReported(appointment.id, resultData.adminId)
      }
    }
  }

  async sendNotification(resultData: PCRTestResultEmailDTO): Promise<void> {
    switch (resultData.resultSpecs.action) {
      case PCRResultActions.ReRunToday: {
        await this.sendRerunNotification(resultData, 'TODAY')
        console.log(`SendNotification: Success: ${resultData.barCode} ReRunToday`)
        break
      }
      case PCRResultActions.ReRunTomorrow: {
        await this.sendRerunNotification(resultData, 'Tomorrow')
        console.log(`SendNotification: Success: ${resultData.barCode} ReRunTomorrow`)
        break
      }
      case PCRResultActions.RequestReSample: {
        await this.sendReSampleNotification(resultData)
        console.log(`SendNotification: Success: ${resultData.barCode} RequestReSample`)
        break
      }
      default: {
        if (this.whiteListedResultsForNotification.includes(resultData.result)) {
          await this.sendTestResults(resultData)
          console.log(`SendNotification: Success: Sent Results for ${resultData.barCode}`)
        } else {
          //WARNING
          console.log(
            `SendNotification: Failed:  Blocked by system. ${resultData.barCode} with result ${resultData.result} requested to send notification.`,
          )
        }
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

  async updateDefaultTestResults(
    id: string,
    defaultTestResults: Partial<PCRTestResultDBModel>,
  ): Promise<void> {
    await this.pcrTestResultsRepository.updateData(id, defaultTestResults)
  }

  async saveDefaultTestResults(
    defaultTestResults: Omit<PCRTestResultDBModel, 'id' | 'updatedAt'>,
  ): Promise<PCRTestResultDBModel> {
    return await this.pcrTestResultsRepository.save(defaultTestResults)
  }

  async getPCRTestsByBarcode(barCodes: string[]): Promise<PCRTestResultDBModel[]> {
    return this.pcrTestResultsRepository.findWhereIn('barCode', barCodes)
  }

  async getPCRTestsByBarcodeWithLinked(barCodes: string[]): Promise<PCRTestResultLinkedDBModel[]> {
    const testResults = await this.getPCRTestsByBarcode(barCodes)
    let testResultsLinked: PCRTestResultLinkedDBModel[] = []
    testResultsLinked = await Promise.all(
      testResults.map(async (testResult) => {
        if (testResult?.linkedBarCodes?.length) {
          return {
            ...testResult,
            linkedResults: await this.getPCRTestsByBarcode([...testResult?.linkedBarCodes]),
          }
        }
        return {
          ...testResult,
          linkedResults: [],
        }
      }),
    )
    return testResultsLinked
  }

  async updateOrganizationIdByAppointmentId(
    appointmentId: string,
    organizationId: string,
  ): Promise<void> {
    const pcrTestResults = await this.getTestResultsByAppointmentId(appointmentId)
    pcrTestResults.map(
      async (pcrTestResult) =>
        await this.pcrTestResultsRepository.updateData(pcrTestResult.id, {organizationId}),
    )
  }

  async addTestRunToPCR(
    testRunId: string,
    pcrTestResultId: string,
    adminId: string,
  ): Promise<void> {
    const pcrTestResults = await this.pcrTestResultsRepository.get(pcrTestResultId)
    if (!pcrTestResults) {
      throw new ResourceNotFoundException(`PCR Result with id ${pcrTestResultId} not found`)
    }
    await this.pcrTestResultsRepository.updateProperty(pcrTestResultId, 'testRunId', testRunId)
    await this.appointmentService.makeInProgress(pcrTestResults.appointmentId, testRunId, adminId)
  }

  async getReason(barCode: string): Promise<AppointmentReasons> {
    const appointment = await this.appointmentService.getAppointmentByBarCode(barCode)
    switch (appointment.appointmentStatus) {
      case AppointmentStatus.Reported:
        return AppointmentReasons.AlreadyReported
      case AppointmentStatus.ReSampleRequired:
        return AppointmentReasons.ReSampleAlreadyRequested
      default:
        return AppointmentReasons.NoInProgress
    }
  }
}
