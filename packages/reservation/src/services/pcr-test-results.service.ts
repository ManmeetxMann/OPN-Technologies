import moment from 'moment'
import {fromPairs, sortBy, union} from 'lodash'

import DataStore from '../../../common/src/data/datastore'
import {Config} from '../../../common/src/utils/config'
import {EmailService} from '../../../common/src/service/messaging/email-service'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {DataModelFieldMapOperatorType} from '../../../common/src/data/datamodel.base'
import {ReservationPushTypes} from '../types/appointment-push'
import {toDateFormat} from '../../../common/src/utils/times'
import {OPNPubSub} from '../../../common/src/service/google/pub_sub'
import {safeTimestamp} from '../../../common/src/utils/datetime-util'
import {
  dateToDateTime,
  formatDateRFC822Local,
  formatStringDateRFC822Local,
  getFirestoreTimeStampDate,
  makeDeadlineForFilter,
} from '../utils/datetime.helper'
import {OPNCloudTasks} from '../../../common/src/service/google/cloud_tasks'
import {LogError, LogInfo, LogWarning} from '../../../common/src/utils/logging-setup'

//service
import {AppoinmentService} from './appoinment.service'
import {CouponService} from './coupon.service'
import {ReservationPushService} from './reservation-push.service'

//repository
import {AppointmentsRepository} from '../respository/appointments-repository'
import {PCRTestResultsRepository} from '../respository/pcr-test-results-repository'

import {
  TestResultsReportingTrackerPCRResultsRepository,
  TestResultsReportingTrackerRepository,
} from '../respository/test-results-reporting-tracker-repository'

import {
  AppointmentReasons,
  CreateReportForPCRResultsResponse,
  EmailNotficationTypes,
  getSortOrderByResult,
  PCRResultActions,
  PCRResultActionsAllowedResend,
  PCRResultActionsForConfirmation,
  PCRResultPDFType,
  PcrResultTestActivityAction,
  PCRSendResultDTO,
  PCRTestResultByDeadlineListDTO,
  PCRTestResultConfirmRequest,
  PCRTestResultDBModel,
  PCRTestResultEmailDTO,
  PCRTestResultHistory,
  PCRTestResultLinkedDBModel,
  PCRTestResultListDTO,
  pcrTestResultsDTO,
  PcrTestResultsListByDeadlineRequest,
  PcrTestResultsListRequest,
  pcrTestResultsResponse,
  Result,
  ResultReportStatus,
  resultToStyle,
  TestResutsDTO,
} from '../models/pcr-test-results'

import {
  AppointmentDBModel,
  AppointmentStatus,
  DeadlineLabel,
  Filter,
  filteredAppointmentStatus,
  ResultTypes,
  TestTypes,
} from '../models/appointment'
import {PCRResultPDFContent} from '../templates/pcr-test-results'
import {ResultAlreadySentException} from '../exceptions/result_already_sent'
import {BulkOperationResponse, BulkOperationStatus} from '../types/bulk-operation.type'
import {TestRunsService} from '../services/test-runs.service'
import {TemperatureService} from './temperature.service'
import {LabService} from './lab.service'
import {mapTemperatureStatusToResultTypes} from '../models/temperature'

import {OrganizationService} from '../../../enterprise/src/services/organization-service'

import {UserService} from '../../../common/src/service/user/user-service'
import {AttestationService} from '../../../passport/src/services/attestation-service'
import {PassportStatuses} from '../../../passport/src/models/passport'
import {PulseOxygenService} from './pulse-oxygen.service'

import {BulkTestResultRequest, TestResultsMetaData} from '../models/test-results'
import {AntibodyAllPDFContent} from '../templates/antibody-all'
import {AntibodyIgmPDFContent} from '../templates/antibody-igm'
import {normalizeAnalysis} from '../utils/analysis.helper'
import {CouponEnum} from '../models/coupons'
import {MountSinaiFormater} from '../utils/mount-sinai-formater'
import {UserSyncService} from '../../../enterprise/src/services/user-sync-service'
import {Patient} from '../../../../services-v2/apps/user-service/src/model/patient/patient.entity'

export class PCRTestResultsService {
  private datastore = new DataStore()
  private testResultsReportingTracker = new TestResultsReportingTrackerRepository(this.datastore)
  private pcrTestResultsRepository = new PCRTestResultsRepository(this.datastore)
  private appointmentsRepository = new AppointmentsRepository(this.datastore)

  private appointmentService = new AppoinmentService()
  private organizationService = new OrganizationService()
  private couponService = new CouponService()
  private reservationPushService = new ReservationPushService()
  private emailService = new EmailService()
  private userService = new UserService()
  private whiteListedResultsTypes = [
    ResultTypes.Negative,
    ResultTypes.Positive,
    ResultTypes.PresumptivePositive,
    ResultTypes.Indeterminate,
  ]
  private testRunsService = new TestRunsService()
  private attestationService = new AttestationService()
  private temperatureService = new TemperatureService()
  private pulseOxygenService = new PulseOxygenService()
  private labService = new LabService()
  private userSyncService = new UserSyncService()

  private isAppointmentPushEnable = Config.get('APPOINTMENTS_PUSH_NOTIFY') === 'enabled'

  private postPubSubForResultSend(testResult: PCRTestResultEmailDTO, action: string): void {
    if (Config.get('TEST_RESULT_PUB_SUB_NOTIFY') !== 'enabled') {
      LogInfo('PCRTestResultsService:postPubSubForResultSend', 'PubSubDisabled', {})
      return
    }
    const data: Record<string, string> = {
      id: testResult.id,
      result: testResult.result,
      date: safeTimestamp(testResult.dateTime).toISOString(),
    }
    const attributes: Record<string, string> = {
      userId: testResult.userId,
      organizationId: testResult.organizationId,
      actionType: action,
      phone: testResult.phone.toString(),
      firstName: testResult.firstName,
    }
    const pubsub = new OPNPubSub(Config.get('PCR_TEST_TOPIC'))
    pubsub.publish(data, attributes)
  }

  private async postPubSubForPresumptivePositiveResultSend(
    testResult: PCRTestResultEmailDTO,
    adminId: string,
  ): Promise<void> {
    /*if (Config.get('TEST_RESULT_PUB_SUB_NOTIFY') !== 'enabled') {
      LogInfo('PCRTestResultsService:postPubSubForResultSend', 'PubSubDisabled', {})
      return
    }*/

    // TODO: Don't use userSyncService for getting a that, user sync service should be removed
    const patient = await this.userSyncService.getByFirebaseKey(adminId)

    const data = {
      patientCode: (patient as Patient).patientPublicId,
      barCode: testResult.barCode,
      dateTime: testResult.dateTime,
      firstName: testResult.firstName,
      lastName: testResult.lastName,
      healthCard: testResult.ohipCard,
      dateOfBirth: testResult.dateOfBirth, //YYYYMMDD
      gender: testResult.gender, //GenderHL7
      address1: testResult.address,
      address2: testResult.addressUnit,
      city: testResult.city,
      province: testResult.province, //ON
      postalCode: testResult.postalCode, //A1A1A1
      country: testResult.country,
      testType: testResult.testType,
    }

    //Utility to Format for MountSinai
    const mountSinaiFormater = new MountSinaiFormater(data)
    const formatedORMData = mountSinaiFormater.get()

    const pubsub = new OPNPubSub(Config.get('PRESUMPTIVE_POSITIVE_RESULTS_TOPIC'))
    pubsub.publish(formatedORMData)
  }

  async confirmPCRResults(data: PCRTestResultConfirmRequest): Promise<string> {
    //Validate Result Exists for barCode and throws exception
    const pcrResultHistory = await this.getPCRResultsByBarCode(data.barCode)
    const latestPCRResult = pcrResultHistory[0]
    const appointment = await this.appointmentService.getAppointmentByBarCode(data.barCode)
    if (latestPCRResult.labId !== data.labId && !data.byPassValidation) {
      LogWarning('PCRTestResultsService:confirmPCRResults', 'IncorrectLabId', {
        labIdInDB: latestPCRResult.labId,
        labIdInRequest: data.labId,
      })
      throw new BadRequestException('Not Allowed to Confirm results')
    }
    const labId = latestPCRResult.labId ? latestPCRResult.labId : null
    //Create New Waiting Result
    const runNumber = 0 //Not Relevant
    const reCollectNumber = 0 //Not Relevant
    let finalResult: ResultTypes = ResultTypes.Indeterminate
    let notificationType = EmailNotficationTypes.Indeterminate
    let recollected = false
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
      case PCRResultActionsForConfirmation.Indeterminate: {
        finalResult = ResultTypes.Inconclusive
        notificationType = EmailNotficationTypes.Indeterminate
        recollected = true
        break
      }
    }
    const newPCRResult = await this.pcrTestResultsRepository.createNewTestResults({
      appointment,
      adminId: data.adminId,
      runNumber,
      reCollectNumber,
      result: finalResult,
      waitingResult: false,
      confirmed: true,
      previousResult: latestPCRResult.result,
      labId: labId,
      recollected,
    })

    const lab = await this.labService.findOneById(labId)

    await this.sendNotification(
      {...newPCRResult, ...appointment, labAssay: lab.assay},
      notificationType,
      newPCRResult.id,
      data.adminId,
    )
    return newPCRResult.id
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
      LogError('processTestResult', 'InvalidResultIdInReport', {
        reportTrackerId,
        testResultId: resultId,
      })
      return
    }

    if (pcrResults.status !== ResultReportStatus.RequestReceived) {
      LogError('processTestResult', 'AlreadyProcessed', {
        reportTrackerId,
        testResultId: resultId,
        appointmentStatus: pcrResults.status,
        appointmentBarCode: pcrResults.data.barCode,
      })
      return
    }

    await testResultsReportingTrackerPCRResult.updateProperty(
      resultId,
      'status',
      ResultReportStatus.Processing,
    )
    try {
      const metaData: TestResultsMetaData = {
        notify: pcrResults.data.notify,
        resultDate: pcrResults.data.resultDate,
        action: pcrResults.data.action,
        autoResult: pcrResults.data.autoResult,
      }
      if (pcrResults.data.comment) {
        metaData.comment = pcrResults.data.comment
      }
      const pcrTestResult = await this.handlePCRResultSaveAndSend({
        metaData,
        resultAnalysis: pcrResults.data.resultAnalysis,
        barCode: pcrResults.data.barCode,
        isSingleResult: false,
        sendUpdatedResults: false,
        adminId: pcrResults.adminId,
        templateId: pcrResults.data.templateId,
        labId: pcrResults.data.labId,
      })

      await testResultsReportingTrackerPCRResult.updateProperties(resultId, {
        status: await this.getReportStatus(pcrResults.data.action, pcrTestResult.result),
        details: 'Action Completed',
      })
      LogInfo('processTestResult', 'SuccessfullyProcessed', {
        reportTrackerId,
        resultId,
      })
    } catch (error) {
      await testResultsReportingTrackerPCRResult.updateProperties(resultId, {
        status: ResultReportStatus.Failed,
        details: error.toString(),
      })
      LogWarning('processTestResult', 'handlePCRResultSaveAndSendFailed', {
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
    const statusesForInProgressCondition: (ResultTypes | ResultReportStatus)[] = [
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
    {
      organizationId,
      barCode,
      result,
      testType,
      date,
      searchQuery,
      labId,
      userId,
    }: PcrTestResultsListRequest,
    isLabUser: boolean,
    isClinicUser: boolean,
  ): Promise<PCRTestResultListDTO[]> {
    const pcrTestResultsQuery = []
    let pcrResults: PCRTestResultDBModel[] = []

    if (labId) {
      pcrTestResultsQuery.push({
        map: '/',
        key: 'labId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: labId === 'null' ? null : labId,
      })
    }

    //TODO: Allow BarCode with ORG
    if (organizationId) {
      pcrTestResultsQuery.push({
        map: '/',
        key: 'organizationId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: organizationId === 'null' ? null : organizationId,
      })
    }

    if (date) {
      if (isLabUser) {
        pcrTestResultsQuery.push({
          map: '/',
          key: 'deadlineDate',
          operator: DataModelFieldMapOperatorType.Equals,
          value: dateToDateTime(date),
        })
      } else {
        pcrTestResultsQuery.push({
          map: '/',
          key: 'dateOfAppointment',
          operator: DataModelFieldMapOperatorType.Equals,
          value: dateToDateTime(date),
        })
      }
      pcrTestResultsQuery.push({
        map: '/',
        key: 'displayInResult',
        operator: DataModelFieldMapOperatorType.Equals,
        value: true,
      })
    } else if (barCode) {
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
    }

    //Filter
    if (result) {
      pcrTestResultsQuery.push({
        map: '/',
        key: 'result',
        operator: DataModelFieldMapOperatorType.Equals,
        value: result,
      })
    }

    if (userId) {
      pcrTestResultsQuery.push({
        map: '/',
        key: 'userId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: userId,
      })
    }

    //Apply for Corporate
    if (testType) {
      if (testType === TestTypes.allExceptAntigen) {
        pcrTestResultsQuery.push({
          map: '/',
          key: 'testType',
          operator: DataModelFieldMapOperatorType.NotEquals,
          value: TestTypes.RapidAntigen,
        })
      } else {
        pcrTestResultsQuery.push({
          map: '/',
          key: 'testType',
          operator: DataModelFieldMapOperatorType.Equals,
          value: testType,
        })
      }
    }

    if (searchQuery) {
      const search: Promise<PCRTestResultDBModel[]>[] = []
      const query = (key: string, value: string) => ({
        map: '/',
        key,
        operator: DataModelFieldMapOperatorType.Equals,
        value,
      })

      const fullName = searchQuery.split(' ')
      const [firstName, lastName] = fullName

      if (fullName.length == 1) {
        // in this case query may contain only firstname or lastname
        search.push(
          this.pcrTestResultsRepository.findWhereEqualInMap([
            ...pcrTestResultsQuery,
            query('firstName', firstName),
          ]),
          this.pcrTestResultsRepository.findWhereEqualInMap([
            ...pcrTestResultsQuery,
            query('lastName', firstName),
          ]),
        )
      } else {
        // handle normal and reversed name formatting
        search.push(
          this.pcrTestResultsRepository.findWhereEqualInMap([
            ...pcrTestResultsQuery,
            query('firstName', firstName),
            query('lastName', lastName),
          ]),
          this.pcrTestResultsRepository.findWhereEqualInMap([
            ...pcrTestResultsQuery,
            query('firstName', lastName),
            query('lastName', firstName),
          ]),
        )
      }

      const queryResults = await Promise.all(search).then((results) => results.flat())
      pcrResults = [
        ...new Map(queryResults.flat().map((item) => [item.id, item])).values(),
      ] as PCRTestResultDBModel[]
      pcrResults.sort((a, b) => b.sortOrder - a.sortOrder)
    } else {
      if (testType === TestTypes.allExceptAntigen) {
        pcrResults = await this.pcrTestResultsRepository.findWhereEqualInMap(
          pcrTestResultsQuery,
          null,
        )
        pcrResults.sort((a, b) => b.sortOrder - a.sortOrder)
      } else {
        pcrResults = await this.pcrTestResultsRepository.findWhereEqualInMap(
          pcrTestResultsQuery,
          result ? null : {key: 'sortOrder', direction: 'desc'},
        )
      }
    }

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
    const labs = await this.labService.getAll()

    return pcrResults.map((pcr) => {
      const organization = organizations.find(({id}) => id === pcr.organizationId)
      const lab = labs.find(({id}) => id === pcr?.labId)

      return {
        id: pcr.id,
        barCode: pcr.barCode,
        result: getResultValue(pcr.result, !!pcr.resultMetaData?.notify),
        previousResult: pcr.previousResult,
        dateTime: formatDateRFC822Local(pcr.dateTime),
        deadline: formatDateRFC822Local(pcr.deadline),
        testRunId: pcr.testRunId,
        firstName: pcr.firstName,
        lastName: pcr.lastName,
        testType: pcr.testType ?? 'PCR',
        organizationId: organization?.id,
        organizationName: organization?.name,
        appointmentStatus: filteredAppointmentStatus(
          pcr.appointmentStatus,
          isLabUser,
          isClinicUser,
        ),
        labName: lab?.name,
        labId: lab?.id,
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

  async getWaitingPCRResultByAppointmentId(appointmentId: string): Promise<PCRTestResultDBModel> {
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
      case PCRResultActions.ReRunToday: {
        finalResult = ResultTypes.Invalid
        break
      }
      case PCRResultActions.ReRunTomorrow: {
        finalResult = ResultTypes.Invalid
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

  async createReportForTestResults(
    testResultData: BulkTestResultRequest,
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
    const templateId = testResultData.templateId
    const labId = testResultData.labId
    const fileName = testResultData.fileName
    const pcrResults = testResultData.results.map((result) => {
      const data = {
        ...result,
        resultDate,
        templateId,
        labId,
        fileName: fileName || null,
      }
      if (result.comment) {
        data.comment = result.comment
      }
      return {
        data,
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

  async handlePCRResultSaveAndSend(requestData: PCRSendResultDTO): Promise<PCRTestResultDBModel> {
    const {
      metaData,
      resultAnalysis,
      barCode,
      isSingleResult,
      sendUpdatedResults,
      adminId,
      templateId,
      labId,
    } = requestData
    const appointment = await this.appointmentService.getAppointmentByBarCode(barCode)
    const pcrTestResults = await this.getPCRResultsByBarCode(barCode)

    const waitingPCRTestResult = await this.getWaitingPCRTestResult(pcrTestResults)
    const isAlreadyReported =
      appointment.appointmentStatus === AppointmentStatus.Reported ||
      appointment.appointmentStatus === AppointmentStatus.ReCollectRequired
    const inProgress = appointment.appointmentStatus === AppointmentStatus.InProgress
    const finalResult = this.getFinalResult(metaData.action, metaData.autoResult, barCode)

    if (
      !this.whiteListedResultsTypes.includes(finalResult) &&
      metaData.action === PCRResultActions.SendThisResult
    ) {
      LogInfo('handlePCRResultSaveAndSend', 'NoAllowedActionRequested', {
        barCode: barCode,
        finalResult: finalResult,
        action: metaData.action,
      })
      throw new BadRequestException(
        `Barcode: ${barCode} not allowed use action SendThisResult for ${finalResult} Results`,
      )
    }

    if (!waitingPCRTestResult && (!isSingleResult || !isAlreadyReported)) {
      console.error(
        `handlePCRResultSaveAndSend: FailedToSend NotWaitingForResults SingleResult: ${isSingleResult} Current Appointment Status: ${appointment.appointmentStatus}`,
      )
      throw new ResourceNotFoundException(
        `PCR Test Result with barCode ${barCode} is not waiting for results.`,
      )
    }

    if (metaData.action === PCRResultActions.DoNothing) {
      LogInfo('handlePCRResultSaveAndSend', 'DoNothingSelected HenceIgnored', {
        barCode: barCode,
      })
      return waitingPCRTestResult
    }

    if (
      !waitingPCRTestResult &&
      isSingleResult &&
      isAlreadyReported &&
      !this.allowedForResend(metaData.action)
    ) {
      console.error(
        `handlePCRResultSaveAndSend: FailedToSend Already Reported not allowed to do Action: ${metaData.action}`,
      )
      throw new BadRequestException(
        `PCR Test Result with barCode ${barCode} is already Reported. It is not allowed to do ${metaData.action} `,
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
        `handlePCRResultSaveAndSend: Failed PCRResultID ${waitingPCRTestResult.id} Barcode: ${barCode} is not InProgress`,
      )
      throw new BadRequestException(`PCR Test Result with barCode ${barCode} is not InProgress`)
    }

    //Create New Waiting Result for Resend
    const runNumber = 0 //Not Relevant for Resend
    const reCollectNumber = 0 //Not Relevant for Resend
    const testResult =
      isSingleResult && !waitingPCRTestResult
        ? await this.pcrTestResultsRepository.createNewTestResults({
            appointment,
            adminId,
            runNumber,
            reCollectNumber,
            previousResult: latestPCRTestResult.result,
            labId: labId,
            templateId: templateId,
          })
        : waitingPCRTestResult

    const actionsForRecollection = [
      PCRResultActions.RecollectAsInvalid,
      PCRResultActions.RecollectAsInconclusive,
    ]
    //Add Test Results to Waiting Result
    const pcrResultDataForDbUpdate = {
      resultMetaData: metaData,
      resultAnalysis:
        testResult.testType === TestTypes.PCR ? normalizeAnalysis(resultAnalysis) : resultAnalysis,
      barCode,
      deadline: appointment.deadline, //TODO: Remove
      result: finalResult,
      firstName: appointment.firstName, //TODO: Remove
      lastName: appointment.lastName, //TODO: Remove
      appointmentId: appointment.id, //TODO: Remove
      organizationId: appointment.organizationId, //TODO: Remove
      dateTime: appointment.dateTime, //TODO: Remove
      waitingResult: false,
      displayInResult: true,
      recollected: actionsForRecollection.includes(metaData.action),
      confirmed: false,
      sortOrder: getSortOrderByResult(finalResult),
      templateId,
      labId,
    }
    const pcrResultRecorded = await this.pcrTestResultsRepository.updateData({
      id: testResult.id,
      updates: pcrResultDataForDbUpdate,
      actionBy: adminId,
      action: PcrResultTestActivityAction.Create,
    })

    await this.handleActions({
      resultData: {
        adminId,
        barCode,
        action: metaData.action,
        templateId,
        labId,
        id: testResult.id,
      },
      appointment,
      runNumber: testResult.runNumber,
      reCollectNumber: testResult.reCollectNumber,
      result: finalResult,
      actionBy: adminId,
    })

    const lab = await this.labService.findOneById(labId)

    //Send Notification
    if (metaData.notify) {
      const pcrResultDataForEmail = {
        adminId,
        resultId: testResult.id,
        labAssay: lab.assay,
        ...appointment,
        ...pcrResultDataForDbUpdate,
      }
      await this.sendNotification(
        pcrResultDataForEmail,
        metaData.action,
        pcrResultRecorded.id,
        adminId,
      )
    } else {
      console.log(
        `handlePCRResultSaveAndSend: Not Notification is sent for ${barCode}. Notify is off.`,
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
    actionBy,
  }: {
    resultData: {
      adminId: string
      barCode: string
      labId: string
      templateId: string
      action: PCRResultActions
      id: string
    }
    appointment: AppointmentDBModel
    runNumber: number
    reCollectNumber: number
    result: ResultTypes
    actionBy: string
  }): Promise<void> {
    const nextRunNumber = runNumber + 1
    const handledReCollect = async () => {
      await this.appointmentService.changeStatusToReCollectRequired(
        appointment.id,
        resultData.adminId,
      )
    }
    const pcrResult = await this.pcrTestResultsRepository.findOneById(resultData.id)
    switch (resultData.action) {
      case PCRResultActions.SendPreliminaryPositive: {
        const updatedAppointment = await this.appointmentService.changeStatusToReRunRequired({
          appointment: appointment,
          deadlineLabel: DeadlineLabel.NextDay,
          userId: resultData.adminId,
          actionBy,
        })
        await this.pcrTestResultsRepository.createNewTestResults({
          appointment: updatedAppointment,
          adminId: resultData.adminId,
          runNumber: nextRunNumber,
          reCollectNumber,
          previousResult: result,
          labId: resultData.labId,
          templateId: resultData.templateId,
        })
        break
      }
      case PCRResultActions.ReRunToday: {
        const updatedAppointment = await this.appointmentService.changeStatusToReRunRequired({
          appointment: appointment,
          deadlineLabel: DeadlineLabel.SameDay,
          userId: resultData.adminId,
          actionBy,
        })
        await this.pcrTestResultsRepository.createNewTestResults({
          appointment: updatedAppointment,
          adminId: resultData.adminId,
          runNumber: nextRunNumber,
          reCollectNumber,
          previousResult: result,
          labId: resultData.labId,
          templateId: resultData.templateId,
        })
        break
      }
      case PCRResultActions.ReRunTomorrow: {
        const updatedAppointment = await this.appointmentService.changeStatusToReRunRequired({
          appointment: appointment,
          deadlineLabel: DeadlineLabel.NextDay,
          userId: resultData.adminId,
          actionBy,
        })
        await this.pcrTestResultsRepository.createNewTestResults({
          appointment: updatedAppointment,
          adminId: resultData.adminId,
          runNumber: nextRunNumber,
          reCollectNumber,
          previousResult: result,
          labId: resultData.labId,
          templateId: resultData.templateId,
        })
        break
      }
      case PCRResultActions.RecollectAsInvalid: {
        await handledReCollect()
        await this.generateCouponCode(appointment.email, pcrResult)
        break
      }
      case PCRResultActions.RecollectAsInconclusive: {
        await handledReCollect()
        await this.generateCouponCode(appointment.email, pcrResult)
        break
      }
      default: {
        await Promise.all([
          this.appointmentsRepository.changeStatusToReported(appointment.id, resultData.adminId),
          this.pcrTestResultsRepository.updateAllResultsForAppointmentId(
            appointment.id,
            {appointmentStatus: AppointmentStatus.Reported},
            PcrResultTestActivityAction.UpdateFromAppointment,
            actionBy,
          ),
        ])
        break
      }
    }
    LogInfo('handleActions', 'Success', {
      barCode: resultData.barCode,
      action: resultData.action,
      appointmentId: appointment.id,
    })
  }

  async sendNotification(
    resultData: PCRTestResultEmailDTO,
    notficationType: PCRResultActions | EmailNotficationTypes,
    pcrId: string,
    adminId: string,
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
      case PCRResultActions.RecollectAsInconclusive: {
        await this.sendReCollectNotification(resultData, pcrId)
        break
      }
      case PCRResultActions.RecollectAsInvalid: {
        await this.sendReCollectNotification(resultData, pcrId)
        break
      }
      case EmailNotficationTypes.Indeterminate: {
        await this.sendReCollectNotification(resultData, pcrId)
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
          await this.postPubSubForPresumptivePositiveResultSend({...resultData, id: pcrId}, adminId)
        } else if (
          resultData.result === ResultTypes.Indeterminate &&
          (resultData.testType === TestTypes.Antibody_All ||
            resultData.testType === TestTypes.Antibody_IgM)
        ) {
          await this.sendTestResultsWithAttachment(resultData, PCRResultPDFType.Intermediate)
        } else {
          addSuccessLog = false
          LogWarning('sendNotification', 'FailedEmailSent BlockedBySystem', {
            barCode: resultData.barCode,
            notficationType,
            resultSent: resultData.result,
          })
        }
      }
    }

    if (addSuccessLog) {
      this.postPubSubForResultSend({...resultData, id: pcrId}, 'result')
      LogInfo('sendNotification', 'SuccessfullEmailSent', {
        barCode: resultData.barCode,
        notficationType,
        resultSent: resultData.result,
      })
    }
  }

  async resendReport(testResultId: string, userId: string): Promise<void> {
    const {appointment, pcrTestResult} = await this.getTestResultAndAppointment(
      testResultId,
      userId,
      true,
    )

    const lab = await this.labService.findOneById(appointment.labId)

    const resultData = {
      adminId: userId,
      labAssay: lab.assay,
      ...appointment,
      appointmentId: pcrTestResult.appointmentId,
      confirmed: pcrTestResult.confirmed,
      dateTime: pcrTestResult.dateTime,
      displayInResult: pcrTestResult.displayInResult,
      firstName: pcrTestResult.firstName,
      lastName: pcrTestResult.lastName,
      organizationId: pcrTestResult.organizationId,
      recollected: pcrTestResult.recollected,
      result: pcrTestResult.result,
      testRunId: pcrTestResult.testRunId,
      waitingResult: pcrTestResult.waitingResult,
      testType: pcrTestResult.testType,
      resultMetaData: pcrTestResult.resultMetaData,
      resultAnalysis: pcrTestResult.resultAnalysis,
      templateId: pcrTestResult.templateId,
      labId: pcrTestResult.labId,
      appointmentStatus: pcrTestResult.appointmentStatus,
    }

    if (resultData.result === ResultTypes.Negative) {
      await this.sendTestResultsWithAttachment(resultData, PCRResultPDFType.Negative)
    } else if (resultData.result === ResultTypes.Positive) {
      await this.sendTestResultsWithAttachment(resultData, PCRResultPDFType.Positive)
    } else if (resultData.result === ResultTypes.PresumptivePositive) {
      await this.sendTestResultsWithAttachment(resultData, PCRResultPDFType.PresumptivePositive)
    } else if (
      resultData.result === ResultTypes.Indeterminate &&
      (resultData.testType === TestTypes.Antibody_All ||
        resultData.testType === TestTypes.Antibody_IgM)
    ) {
      await this.sendTestResultsWithAttachment(resultData, PCRResultPDFType.Intermediate)
    } else {
      throw new BadRequestException(`Not allowed resend result ${resultData.id}`)
    }
  }

  async sendTestResultsWithAttachment(
    resultData: PCRTestResultEmailDTO,
    pcrResultPDFType: PCRResultPDFType,
  ): Promise<void> {
    let pdfContent = ''
    switch (resultData.testType) {
      case 'Antibody_All':
        pdfContent = await AntibodyAllPDFContent(resultData, pcrResultPDFType)
        break
      case 'Antibody_IgM':
        pdfContent = await AntibodyIgmPDFContent(resultData, pcrResultPDFType)
        break
      default:
        pdfContent = await PCRResultPDFContent(resultData, pcrResultPDFType)
        break
    }

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

    if (this.isAppointmentPushEnable) {
      await this.reservationPushService.sendPushByUserId(
        resultData.userId,
        ReservationPushTypes.ready,
      )
    }
  }

  async sendEmailNotification(resultData: PCRTestResultEmailDTO): Promise<void> {
    const templateId =
      resultData.resultMetaData.action === PCRResultActions.SendPreliminaryPositive
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

  async sendReCollectNotification(resultData: PCRTestResultEmailDTO, pcrId: string): Promise<void> {
    const getTemplateId = (): number => {
      if (!!resultData.organizationId) {
        return Config.getInt('TEST_RESULT_ORG_COLLECT_NOTIFICATION_TEMPLATE_ID') ?? 6
      } else if (resultData.result === ResultTypes.Inconclusive) {
        return (
          Config.getInt('TEST_RESULT_NO_ORG_INCONCLUSIVE_COLLECT_NOTIFICATION_TEMPLATE_ID') ?? 8
        )
      } else {
        return Config.getInt('TEST_RESULT_NO_ORG_COLLECT_NOTIFICATION_TEMPLATE_ID') ?? 5
      }
    }

    const pcrResultDbRecord = await this.pcrTestResultsRepository.findOneById(pcrId)

    const couponCode = pcrResultDbRecord?.couponCode ?? null
    const appointmentBookingBaseURL = Config.get('ACUITY_CALENDAR_URL')
    const owner = Config.get('ACUITY_SCHEDULER_USERNAME')
    const appointmentBookingLink = `${appointmentBookingBaseURL}?owner=${owner}&certificate=${couponCode}`
    const templateId = getTemplateId()

    LogInfo('sendReCollectNotification', 'SendingCouponCode', {
      barCode: resultData.barCode,
      organizationId: resultData.organizationId,
      appointmentId: resultData.appointmentId,
      appointmentEmail: resultData.email,
      couponCode,
    })

    await this.emailService.send({
      templateId: templateId,
      to: [{email: resultData.email, name: `${resultData.firstName} ${resultData.lastName}`}],
      params: {
        COUPON_CODE: couponCode,
        BOOKING_LINK: appointmentBookingLink,
        FIRSTNAME: resultData.firstName,
      },
      bcc: [
        {
          email: Config.get('TEST_RESULT_BCC_EMAIL'),
        },
      ],
    })
    if (this.isAppointmentPushEnable) {
      await this.reservationPushService.sendPushByUserId(
        resultData.userId,
        ReservationPushTypes.reSample,
      )
    }
  }

  async generateCouponCode(email: string, resultData: PCRTestResultDBModel): Promise<string> {
    const couponCode = await this.couponService.createCoupon(email, CouponEnum.forResample)
    await this.couponService.saveCoupon(couponCode, resultData.organizationId, resultData.barCode)

    LogInfo('generateCouponCode', 'CouponCodeCreated', {
      barCode: resultData.barCode,
      pcrResultId: resultData.id,
    })

    await this.pcrTestResultsRepository.updateProperty(resultData.id, 'couponCode', couponCode)

    return couponCode
  }

  async updateTestResults(
    id: string,
    defaultTestResults: Partial<PCRTestResultDBModel>,
    userId: string,
  ): Promise<void> {
    await this.pcrTestResultsRepository.updateData({
      id,
      updates: defaultTestResults,
      action: PcrResultTestActivityAction.UpdateFromAcuity,
      actionBy: userId,
    })
  }

  async updateTestResultByAppointmentId(
    appointmentId: string,
    testResult: Partial<PCRTestResultDBModel>,
    userId: string,
  ): Promise<PCRTestResultDBModel> {
    const result = await this.getTestResultsByAppointmentId(appointmentId)
    if (result.length) {
      const pcrTestResult = result[0]
      return await this.pcrTestResultsRepository.updateData({
        id: pcrTestResult.id,
        updates: testResult,
        actionBy: userId,
        action: PcrResultTestActivityAction.UpdateFromAppointment,
      })
    }
    return null
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
    const appointments = await this.appointmentsRepository.getAppointmentsDBByIds(appointmentIds)
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
        continue
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

  async getPCRResultsStats(
    queryParams: PcrTestResultsListRequest,
    isLabUser: boolean,
    isClinicUser: boolean,
  ): Promise<{
    total: number
    pcrResultStatsByOrgIdArr: Filter[]
    pcrResultStatsByResultArr: Filter[]
    pcrResultStatsByLabIdArr: Filter[]
  }> {
    const pcrTestResults = await this.getPCRResults(queryParams, isLabUser, isClinicUser)

    const pcrResultStatsByResult: Record<ResultTypes, number> = {} as Record<ResultTypes, number>
    const pcrResultStatsByOrgId: Record<string, number> = {}
    const pcrResultStatsByLabId: Record<string, number> = {}
    const organizations = {}
    const labs = {}
    let total = 0

    pcrTestResults.forEach((pcrTest) => {
      if (pcrResultStatsByResult[pcrTest.result]) {
        ++pcrResultStatsByResult[pcrTest.result]
      } else {
        pcrResultStatsByResult[pcrTest.result] = 1
      }
      if (pcrResultStatsByOrgId[pcrTest.organizationId]) {
        ++pcrResultStatsByOrgId[pcrTest.organizationId]
      } else {
        pcrResultStatsByOrgId[pcrTest.organizationId] = 1
        organizations[pcrTest.organizationId] = pcrTest.organizationName
      }
      if (pcrResultStatsByLabId[pcrTest.labId]) {
        ++pcrResultStatsByLabId[pcrTest.labId]
      } else {
        pcrResultStatsByLabId[pcrTest.labId] = 1
        labs[pcrTest.labId] = pcrTest.labName
      }
      ++total
    })

    const pcrResultStatsByResultArr = Object.entries(pcrResultStatsByResult).map(
      ([name, count]) => ({
        id: name,
        name,
        count,
      }),
    )
    const pcrResultStatsByOrgIdArr = Object.entries(pcrResultStatsByOrgId).map(
      ([orgId, count]) => ({
        id: orgId === 'undefined' ? 'null' : orgId,
        name: orgId === 'undefined' ? 'None' : organizations[orgId],
        count,
      }),
    )

    const pcrResultStatsByLabIdArr = Object.entries(pcrResultStatsByLabId).map(
      ([labId, count]) => ({
        id: labId === 'undefined' ? 'null' : labId,
        name: labId === 'undefined' ? 'None' : labs[labId],
        count,
      }),
    )

    return {
      pcrResultStatsByResultArr,
      pcrResultStatsByOrgIdArr,
      pcrResultStatsByLabIdArr,
      total,
    }
  }

  async updateOrganizationIdByAppointmentId(
    appointmentId: string,
    organizationId: string,
    action: PcrResultTestActivityAction,
    actionBy: string,
  ): Promise<void> {
    const pcrTestResults = await this.getTestResultsByAppointmentId(appointmentId)
    pcrTestResults.map(
      async (pcrTestResult) =>
        await this.pcrTestResultsRepository.updateData({
          id: pcrTestResult.id,
          updates: {organizationId},
          action,
          actionBy,
        }),
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
    const appointments = await this.appointmentsRepository.getAppointmentsDBByIds(appoinmentIds)

    await Promise.all(
      pcrTestResults.map(async (pcr) => {
        try {
          const appointment = appointments.find(({id}) => id === pcr.appointmentId)
          const allowedStatusToBeMarkedAsInProgress = [
            AppointmentStatus.Received,
            AppointmentStatus.ReRunRequired,
            AppointmentStatus.InProgress,
          ]
          if (allowedStatusToBeMarkedAsInProgress.includes(appointment.appointmentStatus)) {
            //Add TestRunID and Mark Waiting As True
            await this.pcrTestResultsRepository.updateData({
              id: pcr.id,
              updates: {
                testRunId,
                waitingResult: true,
              },
              action: PcrResultTestActivityAction.AddTestRun,
              actionBy: adminId,
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
              reason: `Don't allowed to add testRunId if appointment status is not ${AppointmentStatus.Received} or ${AppointmentStatus.ReRunRequired} or ${AppointmentStatus.InProgress}`,
            })
            LogWarning('addTestRunToPCR', 'AppointmentWithNotAllowedStatusBlocked', {
              appointmentStatus: appointment.appointmentStatus,
              appointmentId: pcr.appointmentId,
              testRunId,
            })
          }
        } catch (error) {
          results.push({
            id: pcr.id,
            barCode: pcr.barCode,
            status: BulkOperationStatus.Failed,
            reason: 'Internal server error',
          })
          LogError('addTestRunToPCR', 'InternalServerError', {
            appointmentID: pcr.appointmentId,
            testRunId,
            errorMessage: error,
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

  async getPCRResultsFromDB(
    queryParams: PcrTestResultsListByDeadlineRequest,
  ): Promise<PCRTestResultDBModel[]> {
    const pcrTestResultsQuery = []
    const {labId, deadline, barCode, testRunId, organizationId, testType} = queryParams

    const equals = (key: string, value) => ({
      map: '/',
      key,
      operator: DataModelFieldMapOperatorType.Equals,
      value,
    })

    if (labId) {
      pcrTestResultsQuery.push(equals('labId', labId))
    }

    if (deadline) {
      pcrTestResultsQuery.push({
        map: '/',
        key: 'deadline',
        operator: DataModelFieldMapOperatorType.LessOrEqual,
        value: makeDeadlineForFilter(deadline),
      })
      pcrTestResultsQuery.push(equals('waitingResult', true))
    }

    if (barCode) {
      pcrTestResultsQuery.push(equals('barCode', barCode))
      pcrTestResultsQuery.push(equals('waitingResult', true))
    }

    if (testRunId) {
      pcrTestResultsQuery.push(equals('testRunId', testRunId))
    }

    if (organizationId) {
      pcrTestResultsQuery.push(
        equals('organizationId', organizationId === 'null' ? null : organizationId),
      )
    }

    if (testType) {
      pcrTestResultsQuery.push(equals('testType', testType))
    }

    return this.pcrTestResultsRepository.findWhereEqualInMap(pcrTestResultsQuery)
  }

  async getDueDeadlineStats(
    queryParams: PcrTestResultsListByDeadlineRequest,
  ): Promise<{
    pcrResultStatsByResultArr: Filter[]
    pcrResultStatsByOrgIdArr: Filter[]
    total: number
  }> {
    const pcrResults = await this.getPCRResultsFromDB(queryParams)
    const appointmentIds = pcrResults.map(({appointmentId}) => `${appointmentId}`)
    const appointments = await this.appointmentsRepository.getAppointmentsDBByIds(appointmentIds)

    const appointmentStatsByTypes: Record<ResultTypes, number> = {} as Record<ResultTypes, number>
    const appointmentStatsByOrganization: Record<string, number> = {}
    let total = 0

    appointments.forEach((appointment) => {
      const allowedAppointmentStatus = [
        AppointmentStatus.InProgress,
        AppointmentStatus.ReRunRequired,
        AppointmentStatus.Received,
      ]

      const {testRunId} = queryParams
      if (!(allowedAppointmentStatus.includes(appointment.appointmentStatus) || testRunId)) {
        return
      }

      const pcrTest = pcrResults?.find(({appointmentId}) => appointmentId === appointment.id)

      if (appointmentStatsByTypes[appointment.appointmentStatus]) {
        ++appointmentStatsByTypes[appointment.appointmentStatus]
      } else {
        appointmentStatsByTypes[appointment.appointmentStatus] = 1
      }
      if (appointmentStatsByOrganization[pcrTest.organizationId]) {
        ++appointmentStatsByOrganization[pcrTest.organizationId]
      } else {
        appointmentStatsByOrganization[pcrTest.organizationId] = 1
      }
      ++total
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
      total,
    }
  }

  async getDueDeadline(
    queryParams: PcrTestResultsListByDeadlineRequest,
  ): Promise<PCRTestResultByDeadlineListDTO[]> {
    const pcrResults = await this.getPCRResultsFromDB(queryParams)
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
      this.appointmentsRepository.getAppointmentsDBByIds(appointmentIds),
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

      const {appointmentStatus, testRunId} = queryParams
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

  async getReportStatus(action: PCRResultActions, result: ResultTypes): Promise<string> {
    let status: string
    switch (action) {
      case PCRResultActions.DoNothing: {
        status = ResultReportStatus.Skipped
        break
      }
      case PCRResultActions.RecollectAsInconclusive: {
        status = ResultReportStatus.SentReCollectRequestAsInconclusive
        break
      }
      case PCRResultActions.RecollectAsInvalid: {
        status = ResultReportStatus.SentReCollectRequestAsInvalid
        break
      }
      case PCRResultActions.ReRunToday || PCRResultActions.ReRunTomorrow: {
        status = ResultReportStatus.SentReRunRequest
        break
      }
      case PCRResultActions.MarkAsPresumptivePositive: {
        status = ResultReportStatus.SentPresumptivePositive
        break
      }
      case PCRResultActions.SendPreliminaryPositive: {
        status = ResultReportStatus.SentPreliminaryPositive
        break
      }
      default: {
        status = `Sent "${result}"`
      }
    }
    return status
  }

  async getTestResultsByUserId(
    userId: string,
    organizationId?: string,
    testType?: TestTypes,
  ): Promise<TestResutsDTO[]> {
    const pcrTestResultsQuery = [
      {
        map: '/',
        key: 'userId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: userId,
      },
      {
        map: '/',
        key: 'displayInResult',
        operator: DataModelFieldMapOperatorType.Equals,
        value: true,
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
    if (testType) {
      pcrTestResultsQuery.push({
        map: '/',
        key: 'testType',
        operator: DataModelFieldMapOperatorType.Equals,
        value: testType,
      })
    }

    if (testType !== TestTypes.RapidAntigenAtHome) {
      pcrTestResultsQuery.push({
        map: '/',
        key: 'testType',
        operator: DataModelFieldMapOperatorType.NotEquals,
        value: TestTypes.RapidAntigenAtHome,
      })
    }

    const pcrResults = await this.pcrTestResultsRepository.findWhereEqualInMap(pcrTestResultsQuery)
    const [attestations, temperatures, pulseOxygens] = await Promise.all([
      organizationId
        ? this.attestationService.getAllAttestationByUserId(userId, organizationId)
        : this.attestationService.getAllAttestationByOnlyUserId(userId),
      organizationId
        ? this.temperatureService.getAllByUserAndOrgId(userId, organizationId)
        : this.temperatureService.getAllByUserId(userId),
      organizationId
        ? this.pulseOxygenService.getAllByUserAndOrgId(userId, organizationId)
        : this.pulseOxygenService.getAllByUserId(userId),
    ])

    const testResult = []

    pcrResults.map((pcr) => {
      let result: Result
      const appointmentClosed =
        AppointmentStatus.ReCollectRequired === pcr.appointmentStatus ||
        AppointmentStatus.Reported === pcr.appointmentStatus
      if (pcr.appointmentStatus === AppointmentStatus.Pending) {
        result = ResultTypes.Pending
      } else if (appointmentClosed) {
        result = pcr.result
      } else {
        result = AppointmentReasons.InProgress
      }

      testResult.push({
        id: pcr.id,
        type: pcr.testType ?? TestTypes.PCR,
        name: pcr.testType ?? TestTypes.PCR,
        firstName: pcr.firstName,
        lastName: pcr.lastName,
        testDateTime: formatDateRFC822Local(pcr.dateTime),
        style: resultToStyle(result),
        result: result,
        detailsAvailable: appointmentClosed,
      })
    })

    attestations.map((attestation) => {
      if (
        PassportStatuses.Pending !== attestation.status &&
        PassportStatuses.TemperatureCheckRequired !== attestation.status
      ) {
        testResult.push({
          id: attestation.id,
          type: TestTypes.Attestation,
          name: 'Self-Attestation',
          testDateTime: formatStringDateRFC822Local(safeTimestamp(attestation.attestationTime)),
          style: resultToStyle(attestation.status),
          result: attestation.status,
          detailsAvailable: true,
        })
      }
    })

    temperatures.map((temperature) => {
      testResult.push({
        id: temperature.id,
        type: TestTypes.TemperatureCheck,
        name: 'Temperature Check',
        testDateTime: formatDateRFC822Local(temperature.timestamps.createdAt),
        style: resultToStyle(mapTemperatureStatusToResultTypes(temperature.status)),
        result: mapTemperatureStatusToResultTypes(temperature.status),
        detailsAvailable: true,
      })
    })

    pulseOxygens.map((pulseOxygen) => {
      testResult.push({
        id: pulseOxygen.id,
        type: TestTypes.PulseOxygenCheck,
        name: 'Pulse Oxygen',
        testDateTime: formatDateRFC822Local(pulseOxygen.timestamps.createdAt),
        style: resultToStyle(pulseOxygen.status),
        result: pulseOxygen.status,
        detailsAvailable: true,
      })
    })

    return testResult
  }

  getPDFType(appointmentID: string, result: ResultTypes): PCRResultPDFType {
    switch (result) {
      case ResultTypes.Negative:
        return PCRResultPDFType.Negative
      case ResultTypes.Positive:
        return PCRResultPDFType.Positive
      case ResultTypes.PresumptivePositive:
        return PCRResultPDFType.PresumptivePositive

      default:
        LogError('PCRTestResultsService: getPDFType', 'UnSupportedPDFResultType', {
          appointmentID,
          errorMessage: `NotSupported Result ${result}`,
        })
    }
  }

  getAntibodyPDFType(appointmentID: string, result: ResultTypes): PCRResultPDFType {
    switch (result) {
      case ResultTypes.Negative:
        return PCRResultPDFType.Negative
      case ResultTypes.Positive:
        return PCRResultPDFType.Positive
      case ResultTypes.Indeterminate:
        return PCRResultPDFType.Intermediate

      default:
        LogError('PCRTestResultsService: getPDFType', 'UnSupportedPDFResultType', {
          appointmentID,
          errorMessage: `NotSupported Result ${result}`,
        })
    }
  }

  async getTestResultAndAppointment(
    id: string,
    userId: string,
    isAdmin = false,
  ): Promise<{appointment: AppointmentDBModel; pcrTestResult: PCRTestResultDBModel}> {
    const pcrTestResult = await this.getPCRResultsById(id)

    if (!pcrTestResult) {
      throw new ResourceNotFoundException(`PCRTestResult with id ${id} not found`)
    }

    const isParent = await this.userService.isParentForChild(userId, pcrTestResult?.userId)

    //TODO
    if (pcrTestResult?.userId !== userId && !isParent && !isAdmin) {
      throw new ResourceNotFoundException(`${id} does not exist`)
    }

    const appointment = await this.appointmentService.getAppointmentDBById(
      pcrTestResult.appointmentId,
    )

    if (!appointment) {
      throw new ResourceNotFoundException(
        `Appointment with appointmentId ${pcrTestResult.appointmentId} not found, PCR Result id ${id}`,
      )
    }

    if (appointment?.userId !== userId && !isParent && !isAdmin) {
      LogWarning('TestResultsController: testResultDetails', 'Unauthorized', {
        userId,
        resultId: id,
        appointmentId: pcrTestResult.appointmentId,
      })
      throw new ResourceNotFoundException(`${id} does not exist`)
    }

    return {
      appointment,
      pcrTestResult,
    }
  }

  isDownloadable(pcrTestResult: PCRTestResultDBModel): boolean {
    const allowedResultTypes = [
      ResultTypes.Negative,
      ResultTypes.Positive,
      ResultTypes.PresumptivePositive,
    ]
    return allowedResultTypes.includes(pcrTestResult.result)
  }

  async getAllResultsByUserAndChildren(
    userId: string,
    organizationid?: string,
    testType?: TestTypes,
  ): Promise<TestResutsDTO[]> {
    const {guardian, dependants} = await this.userService.getUserAndDependants(userId)
    const guardianTestResults = await this.getTestResultsByUserId(
      guardian.id,
      organizationid,
      testType,
    )

    if (dependants.length) {
      const pendingResults = dependants.map(({id}) =>
        this.getTestResultsByUserId(id, organizationid, testType),
      )
      const dependantsTestResults = await Promise.all(pendingResults)
      const childrenTestResults = dependantsTestResults.flat()

      return this.sortTestResultsByDate([...guardianTestResults, ...childrenTestResults])
    }

    return this.sortTestResultsByDate(guardianTestResults)
  }

  async sortTestResultsByDate(tests: TestResutsDTO[]): Promise<TestResutsDTO[]> {
    return tests.sort(
      (a, b) => new Date(b.testDateTime).getTime() - new Date(a.testDateTime).getTime(),
    )
  }

  async updatePCRResultsFromAcuity(
    updatedAppointment: AppointmentDBModel,
    actionBy: string,
  ): Promise<PCRTestResultDBModel> {
    try {
      const pcrTestResult = await this.getWaitingPCRResultByAppointmentId(updatedAppointment.id)

      if (updatedAppointment.appointmentStatus === AppointmentStatus.Canceled) {
        await this.deleteTestResults(pcrTestResult.id)
        LogInfo('PCRTestResultsService:updatePCRResultsFromAcuity', 'RemovedResults', {
          appoinmentID: updatedAppointment.id,
          pcrResultID: pcrTestResult.id,
        })
      } else {
        const pcrResultDataForDb = {
          adminId: actionBy,
          appointmentId: updatedAppointment.id,
          barCode: updatedAppointment.barCode,
          displayInResult: true,
          dateTime: updatedAppointment.dateTime,
          deadline: updatedAppointment.deadline,
          firstName: updatedAppointment.firstName,
          lastName: updatedAppointment.lastName,
          //linkedBarCodes: linkedBarcodes,
          organizationId: updatedAppointment.organizationId,
          deadlineDate: getFirestoreTimeStampDate(updatedAppointment.deadline),
          dateOfAppointment: getFirestoreTimeStampDate(updatedAppointment.dateTime),
          //result: ResultTypes.Pending,
          //runNumber: 1 ,//Start the Run
          //waitingResult: true,
          testType: updatedAppointment.testType,
          userId: updatedAppointment.userId,
          appointmentStatus: updatedAppointment.appointmentStatus,
        }

        return await this.pcrTestResultsRepository.updateData({
          id: pcrTestResult.id,
          updates: pcrResultDataForDb,
          action: PcrResultTestActivityAction.UpdateFromAcuity,
          actionBy: actionBy,
        })
      }
    } catch (error) {
      LogWarning(
        'PCRTestResultsService:updatePCRResultsFromAcuity',
        'FailedToGetWaitingPCRResults',
        {
          acuityID: updatedAppointment.acuityAppointmentId,
          appoinmentID: updatedAppointment.id,
          errorMessage: error.toString(),
        },
      )
    }
  }
}
