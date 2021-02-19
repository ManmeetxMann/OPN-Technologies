import moment from 'moment'
import {sortBy, union, fromPairs} from 'lodash'

import DataStore from '../../../common/src/data/datastore'
import {Config} from '../../../common/src/utils/config'
import {EmailService} from '../../../common/src/service/messaging/email-service'
import {PdfService} from '../../../common/src/service/reports/pdf'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {DataModelFieldMapOperatorType} from '../../../common/src/data/datamodel.base'
import {toDateFormat} from '../../../common/src/utils/times'
import {formatDateRFC822Local, makeDeadlineForFilter} from '../utils/datetime.helper'
import {OPNCloudTasks} from '../../../common/src/service/google/cloud_tasks'
import {LogError, LogInfo, LogWarning} from '../../../common/src/utils/logging-setup'

import {AppoinmentService} from './appoinment.service'
import {CouponService} from './coupon.service'

import {PCRTestResultsRepository} from '../respository/pcr-test-results-repository'
import {
  TestResultsReportingTrackerPCRResultsRepository,
  TestResultsReportingTrackerRepository,
} from '../respository/test-results-reporting-tracker-repository'

import {
  AppointmentReasons,
  CreateReportForPCRResultsResponse,
  EmailNotficationTypes,
  PCRResultActions,
  PCRResultActionsAllowedResend,
  PCRResultActionsForConfirmation,
  PCRResultPDFType,
  PCRTestResultByDeadlineListDTO,
  PCRTestResultConfirmRequest,
  PCRTestResultData,
  PCRTestResultDBModel,
  PCRTestResultEmailDTO,
  PCRTestResultHistory,
  PCRTestResultLinkedDBModel,
  PCRTestResultListDTO,
  PCRTestResultRequest,
  pcrTestResultsDTO,
  PcrTestResultsListByDeadlineRequest,
  PcrTestResultsListRequest,
  pcrTestResultsResponse,
  PCRTestResultType,
  ResultReportStatus,
  resultToStyle,
  TestResutsDTO,
} from '../models/pcr-test-results'

import {
  AppointmentDBModel,
  AppointmentStatus,
  DeadlineLabel,
  Filter,
  ResultTypes,
} from '../models/appointment'
import {PCRResultPDFContent} from '../templates'
import {ResultAlreadySentException} from '../exceptions/result_already_sent'
import {BulkOperationResponse, BulkOperationStatus} from '../types/bulk-operation.type'
import {OrganizationService} from '../../../enterprise/src/services/organization-service'
import {TestRunsService} from '../services/test-runs.service'

export class PCRTestResultsService {
  private datastore = new DataStore()
  private testResultsReportingTracker = new TestResultsReportingTrackerRepository(this.datastore)
  private pcrTestResultsRepository = new PCRTestResultsRepository(this.datastore)
  private appointmentService = new AppoinmentService()
  private organizationService = new OrganizationService()
  private couponService = new CouponService()
  private emailService = new EmailService()
  private pdfService = new PdfService()
  private couponCode: string
  private whiteListedResultsTypes = [
    ResultTypes.Negative,
    ResultTypes.Positive,
    ResultTypes.PresumptivePositive,
  ]
  private testRunsService = new TestRunsService()

  async confirmPCRResults(data: PCRTestResultConfirmRequest, adminId: string): Promise<string> {
    //Validate Result Exists for barCode and throws exception
    const pcrResultHistory = await this.getPCRResultsByBarCode(data.barCode)
    const latestPCRResult = pcrResultHistory[0]
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
      previousResult: latestPCRResult.result,
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
      LogError('processPCRTestResult', 'InvalidResultIdInReport', {
        reportTrackerId,
        resultId,
      })
      return
    }

    if (pcrResults.status !== ResultReportStatus.RequestReceived) {
      LogError('processPCRTestResult', 'AlreadyProcessed', {
        reportTrackerId,
        resultId,
        currentStatus: pcrResults.status,
        barCode: pcrResults.data.barCode,
      })
      return
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
      LogInfo('processPCRTestResult', 'SuccessfullyProcessed', {
        reportTrackerId,
        resultId,
      })
    } catch (error) {
      await testResultsReportingTrackerPCRResult.updateProperties(resultId, {
        status: ResultReportStatus.Failed,
        details: error.toString(),
      })
      LogWarning('processPCRTestResult', 'handlePCRResultSaveAndSendFailed', {
        reportTrackerId,
        resultId,
        error: error.toString(),
        barCode: pcrResults.data.barCode,
      })
    }
  }

  async listPCRTestResultReportStatus(
    reportTrackerId: string,
  ): Promise<{inProgress: boolean; pcrTestResults: pcrTestResultsDTO[]}> {
    const testResultsReportingTrackerPCRResult = new TestResultsReportingTrackerPCRResultsRepository(
      this.datastore,
      reportTrackerId,
    )

    let inProgress = false
    const testResultsReporting = await testResultsReportingTrackerPCRResult.fetchAll()
    const statusesForInProgressCondition = [
      ResultReportStatus.RequestReceived,
      ResultReportStatus.Processing,
    ]

    const pcrTestResults = testResultsReporting.map((pcrTestResult) => {
      if (statusesForInProgressCondition.includes(pcrTestResult.status)) {
        inProgress = true
      }

      return pcrTestResultsResponse(pcrTestResult)
    })

    return {
      inProgress,
      pcrTestResults,
    }
  }

  async getPCRResults(
    {organizationId, deadline, barCode, result}: PcrTestResultsListRequest,
    isLabUser: boolean,
  ): Promise<PCRTestResultListDTO[]> {
    const pcrTestResultsQuery = []
    //TODO: Allow BarCode with ORG
    if (organizationId) {
      pcrTestResultsQuery.push({
        map: '/',
        key: 'organizationId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: organizationId,
      })
    }

    if (barCode) {
      pcrTestResultsQuery.push({
        map: '/',
        key: 'barCode',
        operator: DataModelFieldMapOperatorType.Equals,
        value: barCode,
      })
      pcrTestResultsQuery.push({
        map: '/',
        key: 'displayInResult',
        operator: DataModelFieldMapOperatorType.Equals,
        value: true,
      })
    } else if (deadline) {
      pcrTestResultsQuery.push({
        map: '/',
        key: 'deadline',
        operator: DataModelFieldMapOperatorType.Equals,
        value: makeDeadlineForFilter(deadline),
      })
      pcrTestResultsQuery.push({
        map: '/',
        key: 'displayInResult',
        operator: DataModelFieldMapOperatorType.Equals,
        value: true,
      })
    }

    if (result) {
      pcrTestResultsQuery.push({
        map: '/',
        key: 'result',
        operator: DataModelFieldMapOperatorType.Equals,
        value: result,
      })
    }

    const pcrResults = await this.pcrTestResultsRepository.findWhereEqualInMap(
      pcrTestResultsQuery,
      result ? null : {key: 'result', direction: 'desc'},
    )

    const getResultValue = (result: ResultTypes, notify: boolean): ResultTypes => {
      if (isLabUser) {
        //NoOverwrite For LabUser
        return result
      }

      if (notify !== true && !this.whiteListedResultsTypes.includes(result)) {
        return ResultTypes.Pending
      }
      return result
    }

    const orgIds = []

    pcrResults.forEach(({organizationId}) => {
      if (organizationId) orgIds.push(organizationId)
    })

    const organizations = await this.organizationService.getAllByIds(orgIds)

    return pcrResults.map((pcr) => {
      const organization = organizations.find(({id}) => id === pcr.organizationId)

      return {
        id: pcr.id,
        barCode: pcr.barCode,
        result: getResultValue(pcr.result, !!pcr.resultSpecs?.notify),
        previousResult: pcr.previousResult,
        dateTime: formatDateRFC822Local(pcr.dateTime),
        deadline: formatDateRFC822Local(pcr.deadline),
        testRunId: pcr.testRunId,
        firstName: pcr.firstName,
        lastName: pcr.lastName,
        testType: 'PCR',
        organizationName: organization?.name,
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
      case PCRResultActions.MarkAsNegative: {
        finalResult = ResultTypes.Negative
        break
      }
      case PCRResultActions.MarkAsPresumptivePositive: {
        finalResult = ResultTypes.PresumptivePositive
        break
      }
      case PCRResultActions.MarkAsPositive: {
        finalResult = ResultTypes.Positive
        break
      }
      case PCRResultActions.RecollectAsInvalid: {
        finalResult = ResultTypes.Invalid
        break
      }
      case PCRResultActions.RecollectAsInconclusive: {
        finalResult = ResultTypes.Inconclusive
        break
      }
      case PCRResultActions.SendPreliminaryPositive: {
        finalResult = ResultTypes.PreliminaryPositive
        break
      }
    }

    if (finalResult !== autoResult) {
      LogInfo('getFinalResult', 'TestResultOverwrittten', {
        barCode,
        autoResult,
        finalResult,
      })
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

  getPCRResultsById(id: string): Promise<PCRTestResultDBModel> {
    return this.pcrTestResultsRepository.findOneById(id)
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
      return lastPCRResult.updatedAt.seconds > pcrResult.updatedAt.seconds
        ? lastPCRResult
        : pcrResult
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
      LogInfo('handlePCRResultSaveAndSend', 'DoNothingSelected HenceIgnored', {
        barCode: resultData.barCode,
      })
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
      LogInfo('handlePCRResultSaveAndSend', 'NoAllowedActionRequested', {
        barCode: resultData.barCode,
        finalResult: finalResult,
        action: resultData.resultSpecs.action,
      })
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

    const latestPCRTestResult = await this.getLatestPCRTestResult(pcrTestResults)
    if (!waitingPCRTestResult && isSingleResult && isAlreadyReported && !sendUpdatedResults) {
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
        `handlePCRResultSaveAndSend: Failed PCRResultID ${waitingPCRTestResult.id} Barcode: ${resultData.barCode} is not InProgress`,
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
            previousResult: latestPCRTestResult.result,
          })
        : waitingPCRTestResult

    const actionsForRecollection = [
      PCRResultActions.RequestReCollect,
      PCRResultActions.RecollectAsInvalid,
      PCRResultActions.RecollectAsInconclusive,
    ]
    //Add Test Results to Waiting Result
    const pcrResultDataForDbUpdate = {
      ...resultData,
      deadline: appointment.deadline, //TODO: Remove
      result: finalResult,
      firstName: appointment.firstName, //TODO: Remove
      lastName: appointment.lastName, //TODO: Remove
      appointmentId: appointment.id, //TODO: Remove
      organizationId: appointment.organizationId, //TODO: Remove
      dateTime: appointment.dateTime, //TODO: Remove
      waitingResult: false,
      displayInResult: true,
      recollected: actionsForRecollection.includes(resultData.resultSpecs.action),
      confirmed: false,
    }
    const pcrResultRecorded = await this.pcrTestResultsRepository.updateData(
      testResult.id,
      pcrResultDataForDbUpdate,
    )

    await this.handleActions({
      resultData,
      appointment,
      runNumber: testResult.runNumber,
      reCollectNumber: testResult.reCollectNumber,
      result: finalResult,
    })

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

  async handleActions({
    resultData,
    appointment,
    runNumber,
    reCollectNumber,
    result,
  }: {
    resultData: PCRTestResultData
    appointment: AppointmentDBModel
    runNumber: number
    reCollectNumber: number
    result: ResultTypes
  }): Promise<void> {
    const nextRunNumber = runNumber + 1
    const handledReCollect = async () => {
      console.log(`TestResultReCollect: for ${resultData.barCode} is requested`)
      await this.appointmentService.changeStatusToReCollectRequired(
        appointment.id,
        resultData.adminId,
      )

      if (!appointment.organizationId) {
        //TODO: Move this to Email Function
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
    }
    switch (resultData.resultSpecs.action) {
      case PCRResultActions.SendPreliminaryPositive: {
        console.log(
          `TestResultSendPreliminaryPositive: for ${resultData.barCode} is added to queue for today`,
        )
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
          previousResult: result,
        })
        break
      }
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
          previousResult: result,
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
          previousResult: result,
        })
        break
      }
      case PCRResultActions.RequestReCollect: {
        //TODO: Remove this after FE updates
        await handledReCollect()
        break
      }
      case PCRResultActions.RecollectAsInvalid: {
        await handledReCollect()
        break
      }
      case PCRResultActions.RecollectAsInconclusive: {
        await handledReCollect()
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
    let addSuccessLog = true
    switch (notficationType) {
      case PCRResultActions.SendPreliminaryPositive: {
        await this.sendEmailNotification(resultData)
        break
      }
      case PCRResultActions.ReRunToday: {
        await this.sendEmailNotification(resultData)
        break
      }
      case PCRResultActions.ReRunTomorrow: {
        await this.sendEmailNotification(resultData)
        break
      }
      case PCRResultActions.RequestReCollect: {
        //TODO Remove This
        await this.sendReCollectNotification(resultData)
        break
      }
      case PCRResultActions.RecollectAsInconclusive: {
        await this.sendReCollectNotification(resultData)
        break
      }
      case PCRResultActions.RecollectAsInvalid: {
        await this.sendReCollectNotification(resultData)
        break
      }
      case EmailNotficationTypes.MarkAsConfirmedNegative: {
        await this.sendTestResultsWithAttachment(resultData, PCRResultPDFType.ConfirmedNegative)
        break
      }
      case EmailNotficationTypes.MarkAsConfirmedPositive: {
        await this.sendTestResultsWithAttachment(resultData, PCRResultPDFType.ConfirmedPositive)
        break
      }
      default: {
        if (resultData.result === ResultTypes.Negative) {
          await this.sendTestResultsWithAttachment(resultData, PCRResultPDFType.Negative)
        } else if (resultData.result === ResultTypes.Positive) {
          await this.sendTestResultsWithAttachment(resultData, PCRResultPDFType.Positive)
        } else if (resultData.result === ResultTypes.PresumptivePositive) {
          await this.sendTestResultsWithAttachment(resultData, PCRResultPDFType.PresumptivePositive)
        } else {
          addSuccessLog = false
          LogWarning('sendNotification', 'FailedEmailSent BlockedBySystem', {
            barCode: resultData.barCode,
            notficationType,
            resultSent: resultData.result
          })
        }
      }
    }

    if(addSuccessLog){
      LogInfo('sendNotification', 'SuccessfullEmailSent', {
        barCode: resultData.barCode,
        notficationType,
        resultSent: resultData.result
      })
    }
  }

  async sendTestResultsWithAttachment(
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
        FIRSTNAME: resultData.firstName,
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

  async sendEmailNotification(resultData: PCRTestResultEmailDTO): Promise<void> {
    const templateId =
      resultData.resultSpecs.action === PCRResultActions.SendPreliminaryPositive
        ? Config.getInt('TEST_RESULT_PRELIMNARY_RESULTS_TEMPLATE_ID')
        : Config.getInt('TEST_RESULT_RERUN_NOTIFICATION_TEMPLATE_ID')
    await this.emailService.send({
      templateId: templateId,
      to: [{email: resultData.email, name: `${resultData.firstName} ${resultData.lastName}`}],
      params: {
        FIRSTNAME: resultData.firstName,
      },
      bcc: [
        {
          email: Config.get('TEST_RESULT_BCC_EMAIL'),
        },
      ],
    })
  }

  async sendReCollectNotification(resultData: PCRTestResultEmailDTO): Promise<void> {
    const getTemplateId = (): number => {
      if (resultData.result === ResultTypes.Inconclusive) {
        return (
          Config.getInt('TEST_RESULT_NO_ORG_INCONCLUSIVE_COLLECT_NOTIFICATION_TEMPLATE_ID') ?? 8
        )
      } else if (!!resultData.organizationId) {
        return Config.getInt('TEST_RESULT_ORG_COLLECT_NOTIFICATION_TEMPLATE_ID') ?? 6
      } else {
        return Config.getInt('TEST_RESULT_NO_ORG_COLLECT_NOTIFICATION_TEMPLATE_ID') ?? 5
      }
    }
    const appointmentBookingBaseURL = Config.get('ACUITY_CALENDAR_URL')
    const owner = Config.get('ACUITY_SCHEDULER_USERNAME')
    const appointmentBookingLink = `${appointmentBookingBaseURL}?owner=${owner}&certificate=${this.couponCode}`
    const templateId = getTemplateId()

    await this.emailService.send({
      templateId: templateId,
      to: [{email: resultData.email, name: `${resultData.firstName} ${resultData.lastName}`}],
      params: {
        COUPON_CODE: this.couponCode,
        BOOKING_LINK: appointmentBookingLink,
        FIRSTNAME: resultData.firstName,
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
    previousResult: ResultTypes
  }): Promise<PCRTestResultDBModel> {
    //Reset Display for all OLD results
    await this.pcrTestResultsRepository.updateAllResultsForAppointmentId(data.appointment.id, {
      displayInResult: false,
    })
    console.log(
      `createNewTestResults: UpdatedAllResults for AppointmentId: ${data.appointment.id} to displayInResult: false`,
    )

    const pcrResultDataForDb = {
      adminId: data.adminId,
      appointmentId: data.appointment.id,
      barCode: data.appointment.barCode,
      confirmed: data.confirmed ?? false,
      dateTime: data.appointment.dateTime,
      displayInResult: true,
      deadline: data.appointment.deadline,
      firstName: data.appointment.firstName,
      lastName: data.appointment.lastName,
      linkedBarCodes: data.linkedBarCodes ?? [],
      organizationId: data.appointment.organizationId,
      previousResult: data.previousResult,
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

  async getPCRTestsByBarcodeWithLinked(barCodes: string[]): Promise<PCRTestResultHistory[]> {
    const waitingResults: Record<string, PCRTestResultLinkedDBModel> = {}
    const historicalResults: Record<string, PCRTestResultLinkedDBModel[]> = {}
    const linkedResults: Record<string, PCRTestResultLinkedDBModel[]> = {}
    const appointmentsByBarCode: Record<string, AppointmentDBModel> = {}
    let linkedBarcodes: string[] = []

    const pcrResults = await this.getPCRTestsByBarcode(barCodes)

    const appointmentIds = pcrResults.map(({appointmentId}) => appointmentId)
    const appointments = await this.appointmentService.getAppointmentsDBByIds(appointmentIds)
    appointments.forEach((appointment) => {
      appointmentsByBarCode[appointment.barCode] = appointment
    })

    pcrResults.forEach((testResult) => {
      historicalResults[testResult.barCode] = historicalResults[testResult.barCode] ?? []

      if (testResult.waitingResult) {
        waitingResults[testResult.barCode] = testResult
      } else {
        historicalResults[testResult.barCode].push(testResult)
      }

      if (testResult.waitingResult && testResult?.linkedBarCodes?.length) {
        linkedBarcodes = linkedBarcodes.concat(testResult.linkedBarCodes)
      }
    })

    const testResultsForLinkedBarCodes = await this.getPCRTestsByBarcode(linkedBarcodes)
    testResultsForLinkedBarCodes.forEach((testResult) => {
      linkedResults[testResult.barCode] = linkedResults[testResult.barCode] ?? []
      linkedResults[testResult.barCode].push(testResult)
    })
    const testResultsWithHistory: PCRTestResultHistory[] = []
    //Loop through base Results
    for (const [barCode, pcrTestResults] of Object.entries(historicalResults)) {
      //If Appointment doesn't exist then don't add result
      if (!appointmentsByBarCode[barCode]) {
        return
      }

      let reason = await this.getReason(appointmentsByBarCode[barCode].appointmentStatus)

      if (waitingResults[barCode]) {
        //Add Linked Results for Waiting Record
        const linkedBarCodes = waitingResults[barCode].linkedBarCodes
        let linkedBarCodeResults: PCRTestResultLinkedDBModel[] = []
        linkedBarCodes.forEach((barCode) => {
          linkedBarCodeResults = linkedBarCodeResults.concat(linkedResults[barCode])
        })

        const pcrTestResultsPlusLinked = pcrTestResults.concat(linkedBarCodeResults)
        const sortedPCRTestResults = pcrTestResultsPlusLinked.sort((a, b) =>
          a.updatedAt.seconds < b.updatedAt.seconds ? 1 : -1,
        )
        const waitingResult = reason ? false : waitingResults[barCode].waitingResult
        testResultsWithHistory.push({
          ...waitingResults[barCode],
          waitingResult,
          results: reason ? [] : sortedPCRTestResults,
          reason,
        })
      } else {
        if (!reason) {
          reason = AppointmentReasons.NotWaitingButInProgress
          console.log(`SomethingWentWrong. ${barCode} inProgress but not waiting!`)
        }
        const latestPCRTestResult = await this.getLatestPCRTestResult(pcrTestResults)
        testResultsWithHistory.push({
          ...latestPCRTestResult,
          results: [],
          reason,
        })
      }
    }

    return testResultsWithHistory
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
    adminId: string,
    pcrTestResultIds: string[],
  ): Promise<BulkOperationResponse[]> {
    const pcrTestResults = await this.pcrTestResultsRepository.findWhereIdIn(pcrTestResultIds)
    const results: BulkOperationResponse[] = []

    if (pcrTestResults.length !== pcrTestResultIds.length) {
      const pcrDbIds = pcrTestResults.map(({id}) => id)

      pcrTestResultIds.map((id) => {
        if (!pcrDbIds.includes(id)) {
          results.push({
            id,
            status: BulkOperationStatus.Failed,
            reason: "Doesn't exist in DB",
          })
        }
      })
    }

    const appoinmentIds = pcrTestResults.map(({appointmentId}) => appointmentId)
    const appointments = await this.appointmentService.getAppointmentsDBByIds(appoinmentIds)

    await Promise.all(
      pcrTestResults.map(async (pcr) => {
        try {
          const appointment = appointments.find(({id}) => id === pcr.appointmentId)

          if (
            appointment?.appointmentStatus === AppointmentStatus.Received ||
            appointment?.appointmentStatus === AppointmentStatus.ReRunRequired
          ) {
            await this.pcrTestResultsRepository.updateData(pcr.id, {
              testRunId: testRunId,
              waitingResult: true,
            })

            await this.appointmentService.makeInProgress(pcr.appointmentId, testRunId, adminId)

            results.push({
              id: pcr.id,
              barCode: pcr.barCode,
              status: BulkOperationStatus.Success,
            })
          } else {
            results.push({
              id: pcr.id,
              barCode: pcr.barCode,
              status: BulkOperationStatus.Failed,
              reason: `Don't allowed to add testRunId if appointment status is not ${AppointmentStatus.Received} or ${AppointmentStatus.ReRunRequired}`,
            })
          }
        } catch (error) {
          results.push({
            id: pcr.id,
            barCode: pcr.barCode,
            status: BulkOperationStatus.Failed,
            reason: 'Internal server error',
          })
        }
      }),
    )

    return results
  }

  async getReason(appointmentStatus: AppointmentStatus): Promise<AppointmentReasons> {
    switch (appointmentStatus) {
      case AppointmentStatus.Reported:
        return AppointmentReasons.AlreadyReported
      case AppointmentStatus.ReCollectRequired:
        return AppointmentReasons.ReCollectAlreadyRequested
      case AppointmentStatus.InProgress:
        return null
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
      previousResult: null,
    })
  }

  async getDueDeadlineStats({
    deadline,
    testRunId,
    barCode,
  }: PcrTestResultsListByDeadlineRequest): Promise<{
    pcrResultStatsByResultArr: Filter[]
    pcrResultStatsByOrgIdArr: Filter[]
    total: number
  }> {
    const pcrTestResultsQuery = []

    if (deadline) {
      pcrTestResultsQuery.push({
        map: '/',
        key: 'deadline',
        operator: DataModelFieldMapOperatorType.LessOrEqual,
        value: makeDeadlineForFilter(deadline),
      })
      pcrTestResultsQuery.push({
        map: '/',
        key: 'waitingResult',
        operator: DataModelFieldMapOperatorType.Equals,
        value: true,
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

    const appointmentStatsByTypes: Record<ResultTypes, number> = {} as Record<ResultTypes, number>
    const appointmentStatsByOrganization: Record<string, number> = {}

    appointments.forEach((appointment) => {
      const allowedAppointmentStatus = [
        AppointmentStatus.InProgress,
        AppointmentStatus.ReRunRequired,
        AppointmentStatus.Received,
      ]

      if (!(allowedAppointmentStatus.includes(appointment.appointmentStatus) || testRunId)) {
        return
      }
      const pcrTest = pcrResults?.find(({appointmentId}) => appointmentId === appointment.id)

      if (appointmentStatsByTypes[pcrTest.result]) {
        ++appointmentStatsByTypes[pcrTest.result]
      } else {
        appointmentStatsByTypes[pcrTest.result] = 1
      }
      if (appointmentStatsByOrganization[pcrTest.result]) {
        ++appointmentStatsByOrganization[appointment.organizationId]
      } else {
        appointmentStatsByOrganization[appointment.organizationId] = 1
      }
    })
    const organizations = await this.organizationService.getAllByIds(
      Object.keys(appointmentStatsByOrganization).filter((appointment) => !!appointment),
    )
    const pcrResultStatsByResultArr = Object.entries(appointmentStatsByTypes).map(
      ([name, count]) => ({
        id: name,
        name,
        count,
      }),
    )
    const pcrResultStatsByOrgIdArr = Object.entries(appointmentStatsByOrganization).map(
      ([orgId, count]) => ({
        id: orgId,
        name: organizations.find(({id}) => id === orgId)?.name ?? 'None',
        count,
      }),
    )

    return {
      pcrResultStatsByResultArr,
      pcrResultStatsByOrgIdArr,
      total: appointments.length,
    }
  }

  async getDueDeadline({
    deadline,
    testRunId,
    barCode,
    appointmentStatus,
    organizationId,
  }: PcrTestResultsListByDeadlineRequest): Promise<PCRTestResultByDeadlineListDTO[]> {
    const pcrTestResultsQuery = []

    if (barCode) {
      pcrTestResultsQuery.push({
        map: '/',
        key: 'barCode',
        operator: DataModelFieldMapOperatorType.Equals,
        value: barCode,
      })
      pcrTestResultsQuery.push({
        map: '/',
        key: 'waitingResult',
        operator: DataModelFieldMapOperatorType.Equals,
        value: true,
      })
    } else if (testRunId) {
      pcrTestResultsQuery.push({
        map: '/',
        key: 'testRunId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: testRunId,
      })
    } else if (deadline) {
      pcrTestResultsQuery.push({
        map: '/',
        key: 'deadline',
        operator: DataModelFieldMapOperatorType.LessOrEqual,
        value: makeDeadlineForFilter(deadline),
      })
      pcrTestResultsQuery.push({
        map: '/',
        key: 'waitingResult',
        operator: DataModelFieldMapOperatorType.Equals,
        value: true,
      })

      if (organizationId) {
        pcrTestResultsQuery.push({
          map: '/',
          key: 'organizationId',
          operator: DataModelFieldMapOperatorType.Equals,
          value: organizationId,
        })
      }
    }

    const pcrResults = await this.pcrTestResultsRepository.findWhereEqualInMap(pcrTestResultsQuery)
    const appointmentIds = []
    const testRunIds = []
    const pcrFiltred = []
    const organizationIds = []

    pcrResults.forEach(({appointmentId, testRunId, organizationId}) => {
      appointmentIds.push(appointmentId)
      if (testRunId) testRunIds.push(testRunId)
      if (organizationId) organizationIds.push(organizationId)
    })

    const [appointments, testRuns, organizations] = await Promise.all([
      this.appointmentService.getAppointmentsDBByIds(appointmentIds),
      this.testRunsService.getTestRunByTestRunIds(union(testRunIds)),
      this.organizationService.getAllByIds(union(organizationIds)),
    ])

    const finalOrganization = fromPairs(
      organizations.map((organization) => [organization.id, organization.name]),
    )

    pcrResults.map((pcr) => {
      const appointment = appointments?.find(({id}) => pcr.appointmentId === id)
      const allowedAppointmentStatus = [
        AppointmentStatus.InProgress,
        AppointmentStatus.ReRunRequired,
        AppointmentStatus.Received,
      ]

      if (
        appointment &&
        ((!appointmentStatus && allowedAppointmentStatus.includes(appointment.appointmentStatus)) ||
          appointmentStatus === appointment.appointmentStatus ||
          testRunId)
      ) {
        const testRun = testRuns?.find(({testRunId}) => pcr.testRunId === testRunId)

        pcrFiltred.push({
          id: pcr.id,
          barCode: pcr.barCode,
          deadline: formatDateRFC822Local(pcr.deadline),
          status: appointment?.appointmentStatus,
          testRunId: pcr.testRunId,
          vialLocation: appointment?.vialLocation,
          runNumber: pcr.runNumber ? `R${pcr.runNumber}` : null,
          reCollectNumber: pcr.reCollectNumber ? `S${pcr.reCollectNumber}` : null,
          dateTime: formatDateRFC822Local(appointment.dateTime),
          testRunLabel: testRun?.name,
          organizationName: pcr.organizationId ? finalOrganization[pcr.organizationId] : 'None',
        })
      }
    })

    return sortBy(pcrFiltred, ['status'])
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
      case PCRResultActions.RecollectAsInconclusive: {
        status = ResultReportStatus.SentReCollectRequest
        break
      }
      case PCRResultActions.RecollectAsInvalid: {
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

  async getTestResultsByUserId(userId: string, organizationId: string): Promise<TestResutsDTO[]> {
    const pcrTestResultsQuery = [
      {
        map: '/',
        key: 'userId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: userId,
      },
      {
        map: '/',
        key: 'organizationId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: organizationId,
      },
    ]

    const pcrResults = await this.pcrTestResultsRepository.findWhereEqualInMap(pcrTestResultsQuery)
    const appoinmentIds = pcrResults
      .filter(({result}) => result === ResultTypes.Pending)
      .map(({appointmentId}) => appointmentId)
    const appoinments = await this.appointmentService.getAppointmentsDBByIds(appoinmentIds)

    return pcrResults.map((pcr) => {
      let result = pcr.result

      if (result === ResultTypes.Pending) {
        const appoinment = appoinments.find(({id}) => id === pcr.appointmentId)

        result = ResultTypes[appoinment.appointmentStatus]
      }

      return {
        id: pcr.id,
        type: PCRTestResultType.PCR,
        name: 'PCR Tests',
        testDateTime: formatDateRFC822Local(pcr.deadline),
        style: resultToStyle(result),
        result,
        detailsAvailable: result !== ResultTypes.Pending,
      }
    })
  }
}
