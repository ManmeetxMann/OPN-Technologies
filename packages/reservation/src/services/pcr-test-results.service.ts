import moment from 'moment'

import DataStore from '../../../common/src/data/datastore'
import {Config} from '../../../common/src/utils/config'
import {EmailService} from '../../../common/src/service/messaging/email-service'
import {PdfService} from '../../../common/src/service/reports/pdf'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {DataModelFieldMapOperatorType} from '../../../common/src/data/datamodel.base'
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
  PcrTestResultsListByDeadlineRequest,
  PCRTestResultByDeadlineListDTO,
  PCRTestResultConfirmRequest,
  PCRResultActionsForConfirmation,
  EmailNotficationTypes,
  PCRResultPDFType,
} from '../models/pcr-test-results'

import {
  AppointmentDBModel,
  AppointmentReasons,
  AppointmentStatus,
  DeadlineLabel,
  ResultTypes,
} from '../models/appointment'
import {PCRResultPDFContent} from '../templates'
import {ResultAlreadySentException} from '../exceptions/result_already_sent'
import {makeDeadlineForFilter} from '../utils/datetime.helper'

export class PCRTestResultsService {
  private datastore = new DataStore()
  private testResultsReportingTracker = new TestResultsReportingTrackerRepository(this.datastore)
  private pcrTestResultsRepository = new PCRTestResultsRepository(this.datastore)
  private appointmentService = new AppoinmentService()
  private couponService = new CouponService()
  private emailService = new EmailService()
  private pdfService = new PdfService()
  private couponCode: string
  private whiteListedResultsTypes = [
    ResultTypes.Negative,
    ResultTypes.Positive,
    ResultTypes.PresumptivePositive,
  ]

  async confirmPCRResults(data: PCRTestResultConfirmRequest, adminId: string): Promise<string> {
    //Validate Result Exists for barCode
    await this.getPCRResultsByBarCode(data.barCode)
    const appointment = await this.appointmentService.getAppointmentByBarCode(data.barCode)
    //Create New Waiting Result
    const runNumber = 0 //Not Relevant
    const reCollectNumber = 0 //Not Relevant
    let finalResult: ResultTypes = ResultTypes.Indeterminate
    let notificationType = EmailNotficationTypes.Indeterminate
    switch (data.action) {
      case PCRResultActionsForConfirmation.MarkAsNegative: {
        finalResult = ResultTypes.Negative
        notificationType = EmailNotficationTypes.MarkAsConfirmedNegative
        break
      }
      case PCRResultActionsForConfirmation.MarkAsPositive: {
        finalResult = ResultTypes.Positive
        notificationType = EmailNotficationTypes.MarkAsConfirmedPositive
        break
      }
    }
    const newPCRResult = await this.createNewTestResults({
      appointment,
      adminId,
      runNumber,
      reCollectNumber,
      result: finalResult,
      waitingResult: false,
      confirmed: true,
    })
    await this.sendNotification({...appointment, ...newPCRResult}, notificationType)
    return newPCRResult.id
  }

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
      throw new BadRequestException(
        `ProcessPCRTestResultFailed: ID: ${resultId} BarCode: ${pcrResults.data.barCode} has status ${pcrResults.status}`,
      )
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

      await testResultsReportingTrackerPCRResult.updateProperties(resultId, {
        status: await this.getReportStatus(pcrResults.data.action),
        details: 'Action Completed',
      })
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

  async getPCRResults(
    {organizationId, deadline, barCode}: PcrTestResultsListRequest,
    isLabUser: boolean,
  ): Promise<PCRTestResultListDTO[]> {
    const pcrTestResultsQuery = []

    if (organizationId) {
      pcrTestResultsQuery.push({
        map: '/',
        key: 'organizationId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: organizationId,
      })
    }

    if (deadline) {
      pcrTestResultsQuery.push({
        map: '/',
        key: 'deadline',
        operator: DataModelFieldMapOperatorType.Equals,
        value: makeDeadlineForFilter(deadline),
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

    const appointmentIds = pcrResults.map(({appointmentId}) => appointmentId)
    const appointments = await this.appointmentService.getAppointmentsDBByIds(appointmentIds)

    return pcrResults.map((pcr) => {
      const appointment = appointments?.find(({id}) => pcr.appointmentId === id)

      return {
        id: pcr.id,
        barCode: pcr.barCode,
        result: isLabUser
          ? pcr.result
          : this.getFilteredResultForPublic(pcr.result, !!pcr.resultSpecs?.notify),
        dateTime: appointment.dateTime.toDate().toISOString(),
        deadline: pcr.deadline.toDate().toISOString(),
        testRunId: pcr.testRunId,
        firstName: pcr.firstName,
        lastName: pcr.lastName,
        testType: 'PCR',
      }
    })
  }

  getFilteredResultForPublic(result: ResultTypes, notify: boolean): ResultTypes {
    return notify !== true && !this.whiteListedResultsTypes.includes(result)
      ? ResultTypes.Pending
      : result
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
      case PCRResultActions.MarkAsNegative: {
        console.log(`TestResultOverwrittten: ${barCode} is marked as Negative`)
        finalResult = ResultTypes.Negative
        break
      }
      case PCRResultActions.MarkAsPresumptivePositive: {
        console.log(`TestResultOverwrittten: ${barCode} is marked as Positive`)
        finalResult = ResultTypes.PresumptivePositive
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

  async getPCRResultsByBarCode(barCodeNumber: string): Promise<PCRTestResultDBModel[]> {
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

  async getReCollectedTestResultByBarCode(barCodeNumber: string): Promise<PCRTestResultDBModel> {
    const pcrTestResultsQuery = [
      {
        map: '/',
        key: 'barCode',
        operator: DataModelFieldMapOperatorType.Equals,
        value: barCodeNumber,
      },
      {
        map: '/',
        key: 'recollected',
        operator: DataModelFieldMapOperatorType.Equals,
        value: true,
      },
    ]
    const pcrTestResults = await this.pcrTestResultsRepository.findWhereEqualInMap(
      pcrTestResultsQuery,
    )

    if (!pcrTestResults || pcrTestResults.length === 0) {
      throw new ResourceNotFoundException(
        `PCRTestResult with barCode ${barCodeNumber} and ReCollect Requested not found`,
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

  //TODO: Refactor this. Not needed in favor of getPCRResultsByBarCode
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
    const pcrTestResults = await this.getPCRResultsByBarCode(resultData.barCode)

    const waitingPCRTestResult = await this.getWaitingPCRTestResult(pcrTestResults)
    const isAlreadyReported = appointment.appointmentStatus === AppointmentStatus.Reported
    const inProgress = appointment.appointmentStatus === AppointmentStatus.InProgress
    const finalResult = this.getFinalResult(
      resultData.resultSpecs.action,
      resultData.resultSpecs.autoResult,
      resultData.barCode,
    )

    if (
      !this.whiteListedResultsTypes.includes(finalResult) &&
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
    const reCollectNumber = 0 //Not Relevant for Resend
    const testResult =
      isSingleResult && !waitingPCRTestResult
        ? await this.createNewTestResults({
            appointment,
            adminId: resultData.adminId,
            runNumber,
            reCollectNumber,
          })
        : waitingPCRTestResult

    await this.handleActions(
      resultData,
      appointment,
      testResult.runNumber,
      testResult.reCollectNumber,
    )

    //Update PCR Test results
    const pcrResultDataForDbUpdate = {
      ...resultData,
      deadline: appointment.deadline,
      result: finalResult,
      firstName: appointment.firstName,
      lastName: appointment.lastName,
      appointmentId: appointment.id,
      organizationId: appointment.organizationId,
      dateOfAppointment: appointment.dateOfAppointment,
      waitingResult: false,
      displayForNonAdmins: true, //TODO
      recollected: resultData.resultSpecs.action === PCRResultActions.RequestReCollect,
      confirmed: false,
    }

    const pcrResultRecorded = await this.pcrTestResultsRepository.updateData(
      testResult.id,
      pcrResultDataForDbUpdate,
    )

    //Send Notification
    if (resultData.resultSpecs.notify) {
      const pcrResultDataForEmail = {
        ...pcrResultDataForDbUpdate,
        ...appointment,
      }
      await this.sendNotification(pcrResultDataForEmail, resultData.resultSpecs.action)
    } else {
      console.log(
        `handlePCRResultSaveAndSend: Not Notification is sent for ${resultData.barCode}. Notify is off.`,
      )
    }

    return pcrResultRecorded
  }

  async handleActions(
    resultData: PCRTestResultData,
    appointment: AppointmentDBModel,
    runNumber: number,
    reCollectNumber: number,
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
        await this.createNewTestResults({
          appointment: updatedAppointment,
          adminId: resultData.adminId,
          runNumber: nextRunNumber,
          reCollectNumber,
        })
        break
      }
      case PCRResultActions.ReRunTomorrow: {
        console.log(`TestResultReRun: for ${resultData.barCode} is added to queue for tomorrow`)
        const updatedAppointment = await this.appointmentService.changeStatusToReRunRequired({
          appointment: appointment,
          deadlineLabel: DeadlineLabel.NextDay,
          userId: resultData.adminId,
        })
        await this.createNewTestResults({
          appointment: updatedAppointment,
          adminId: resultData.adminId,
          runNumber: nextRunNumber,
          reCollectNumber,
        })
        break
      }
      case PCRResultActions.RequestReCollect: {
        console.log(`TestResultReCollect: for ${resultData.barCode} is requested`)
        await this.appointmentService.changeStatusToReCollectRequired(
          appointment.id,
          resultData.adminId,
        )

        if (!appointment.organizationId) {
          this.couponCode = await this.couponService.createCoupon(appointment.email)
          console.log(
            `TestResultReCollect: CouponCode ${this.couponCode} is created for ${appointment.email} ReCollectedBarCode: ${resultData.barCode}`,
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

  async sendNotification(
    resultData: PCRTestResultEmailDTO,
    notficationType: PCRResultActions | EmailNotficationTypes,
  ): Promise<void> {
    switch (notficationType) {
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
      case PCRResultActions.RequestReCollect: {
        await this.sendReCollectNotification(resultData)
        console.log(`SendNotification: Success: ${resultData.barCode} RequestReCollect`)
        break
      }
      case EmailNotficationTypes.MarkAsConfirmedNegative: {
        await this.sendTestResults(resultData, PCRResultPDFType.ConfirmedNegative)
        console.log(`SendNotification: Success: ${resultData.barCode} ${notficationType}`)
        break
      }
      case EmailNotficationTypes.MarkAsConfirmedPositive: {
        await this.sendTestResults(resultData, PCRResultPDFType.ConfirmedPositive)
        console.log(`SendNotification: Success: ${resultData.barCode} ${notficationType}`)
        break
      }
      default: {
        if (resultData.result === ResultTypes.Negative) {
          await this.sendTestResults(resultData, PCRResultPDFType.Negative)
          console.log(
            `SendNotification: Success: Sent Results for ${resultData.barCode} Result: ${resultData.result}`,
          )
        } else if (resultData.result === ResultTypes.Positive) {
          await this.sendTestResults(resultData, PCRResultPDFType.Positive)
          console.log(
            `SendNotification: Success: Sent Results for ${resultData.barCode}  Result: ${resultData.result}`,
          )
        } else if (resultData.result === ResultTypes.PresumptivePositive) {
          await this.sendTestResults(resultData, PCRResultPDFType.PresumptivePositive)
          console.log(
            `SendNotification: Success: Sent Results for ${resultData.barCode}  Result: ${resultData.result}`,
          )
        } else {
          //WARNING
          console.log(
            `SendNotification: Failed:  Blocked by system. ${resultData.barCode} with result ${resultData.result} requested to send notification.`,
          )
        }
      }
    }
  }

  async sendTestResults(
    resultData: PCRTestResultEmailDTO,
    pcrResultPDFType: PCRResultPDFType,
  ): Promise<void> {
    const pdfContent = await PCRResultPDFContent(resultData, pcrResultPDFType)
    const resultDate = moment(resultData.dateTime.toDate()).format('LL')

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

  async sendReCollectNotification(resultData: PCRTestResultEmailDTO): Promise<void> {
    const appointmentBookingBaseURL = Config.get('ACUITY_CALENDAR_URL')
    const owner = Config.get('ACUITY_SCHEDULER_USERNAME')
    const appointmentBookingLink = `${appointmentBookingBaseURL}?owner=${owner}&certificate=${this.couponCode}`
    const templateId = resultData.organizationId
      ? Config.getInt('TEST_RESULT_ORG_COLLECT_NOTIFICATION_TEMPLATE_ID') ?? 6
      : Config.getInt('TEST_RESULT_NO_ORG_COLLECT_NOTIFICATION_TEMPLATE_ID') ?? 5

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

  async createNewTestResults(data: {
    appointment: AppointmentDBModel
    adminId: string
    linkedBarCodes?: string[]
    reCollectNumber: number
    runNumber: number
    result?: ResultTypes
    waitingResult?: boolean
    confirmed?: boolean
  }): Promise<PCRTestResultDBModel> {
    const pcrResultDataForDb = {
      adminId: data.adminId,
      appointmentId: data.appointment.id,
      barCode: data.appointment.barCode,
      confirmed: data.confirmed ?? false,
      dateOfAppointment: data.appointment.dateOfAppointment,
      displayForNonAdmins: true,
      deadline: data.appointment.deadline,
      firstName: data.appointment.firstName,
      lastName: data.appointment.lastName,
      linkedBarCodes: data.linkedBarCodes ?? [],
      organizationId: data.appointment.organizationId,
      result: data.result ?? ResultTypes.Pending,
      runNumber: data.runNumber,
      reCollectNumber: data.reCollectNumber,
      waitingResult: data.waitingResult ?? true,
      recollected: false,
    }
    return await this.pcrTestResultsRepository.save(pcrResultDataForDb)
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

  async getReason(appointment: AppointmentDBModel): Promise<AppointmentReasons> {
    switch (appointment.appointmentStatus) {
      case AppointmentStatus.Reported:
        return AppointmentReasons.AlreadyReported
      case AppointmentStatus.ReCollectRequired:
        return AppointmentReasons.ReCollectAlreadyRequested
      default:
        return AppointmentReasons.NoInProgress
    }
  }

  public getlinkedBarcodes = async (couponCode: string): Promise<string[]> => {
    let linkedBarcodes = []
    if (couponCode) {
      //Get Coupon
      const coupon = await this.couponService.getByCouponCode(couponCode)
      if (coupon) {
        linkedBarcodes.push(coupon.lastBarcode)
        try {
          //Get Linked Barcodes for LastBarCode
          const pcrResult = await this.getReCollectedTestResultByBarCode(coupon.lastBarcode)
          if (pcrResult.linkedBarCodes && pcrResult.linkedBarCodes.length) {
            linkedBarcodes = linkedBarcodes.concat(pcrResult.linkedBarCodes)
          }
        } catch (error) {
          console.error(
            `PCRTestResultsService: Coupon Code: ${couponCode} Last BarCode: ${
              coupon.lastBarcode
            }. No Test Results to Link. ${error.toString()}`,
          )
        }
        console.log(
          `PCRTestResultsService: ${couponCode} Return linkedBarcodes as ${linkedBarcodes}`,
        )
      } else {
        console.log(`PCRTestResultsService: ${couponCode} is not coupon.`)
      }
    }
    return linkedBarcodes
  }

  public async createNewPCRTestForWebhook(
    appointment: AppointmentDBModel,
  ): Promise<PCRTestResultDBModel> {
    const linkedBarCodes = await this.getlinkedBarcodes(appointment.packageCode)

    return this.createNewTestResults({
      appointment,
      adminId: 'WEBHOOK',
      linkedBarCodes,
      reCollectNumber: linkedBarCodes.length + 1,
      runNumber: 1,
    })
  }

  async getDueDeadline({
    deadline,
    testRunId,
  }: PcrTestResultsListByDeadlineRequest): Promise<PCRTestResultByDeadlineListDTO[]> {
    const pcrTestResultsQuery = []

    if (deadline) {
      pcrTestResultsQuery.push({
        map: '/',
        key: 'deadline',
        operator: DataModelFieldMapOperatorType.LessOrEqual,
        value: makeDeadlineForFilter(deadline),
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

    const pcrResults = await this.pcrTestResultsRepository.findWhereEqualInMap(pcrTestResultsQuery)
    const appointmentIds = pcrResults.map(({appointmentId}) => `${appointmentId}`)
    const appointments = await this.appointmentService.getAppointmentsDBByIds(appointmentIds)

    const pcrFiltred = []

    pcrResults.map((pcr) => {
      const appointment = appointments?.find(({id}) => pcr.appointmentId === id)
      const allowedAppointmentStatus = [
        AppointmentStatus.InProgress,
        AppointmentStatus.ReRunRequired,
        AppointmentStatus.Received,
      ]
      if (appointment && allowedAppointmentStatus.includes(appointment.appointmentStatus)) {
        pcrFiltred.push({
          id: pcr.id,
          barCode: pcr.barCode,
          deadline: pcr.deadline.toDate(),
          status: appointment?.appointmentStatus,
          testRunId: pcr.testRunId,
          vialLocation: appointment?.vialLocation,
          runNumber: pcr.runNumber ? `R${pcr.runNumber}` : null,
          reCollectNumber: pcr.reCollectNumber ? `S${pcr.reCollectNumber}` : null,
          dateTime: appointment.dateTime,
        })
      }
    })

    return pcrFiltred
  }

  async getReportStatus(action: PCRResultActions): Promise<ResultReportStatus> {
    let status: ResultReportStatus

    switch (action) {
      case PCRResultActions.DoNothing: {
        status = ResultReportStatus.Skipped
        break
      }
      case PCRResultActions.RequestReCollect: {
        status = ResultReportStatus.SentReCollectRequest
        break
      }
      case PCRResultActions.ReRunToday || PCRResultActions.ReRunTomorrow: {
        status = ResultReportStatus.SentReRunRequest
        break
      }
      default: {
        status = ResultReportStatus.SentResult
      }
    }
    return status
  }
}
