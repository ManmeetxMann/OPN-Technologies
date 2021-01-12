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
  CreateReportForPCRResultsResponse,
  PCRResultActions,
  PCRTestResultByDeadlineListDTO,
  PCRTestResultData,
  PCRTestResultDBModel,
  PCRTestResultEmailDTO,
  PCRTestResultListDTO,
  PCRTestResultLinkedDBModel,
  PCRTestResultRequest,
  PcrTestResultsListRequest,
  ResultReportStatus,
  TestResultsReportingTrackerPCRResultsDBModel,
} from '../models/pcr-test-results'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {OPNCloudTasks} from '../../../common/src/service/google/cloud_tasks'
import testResultPDFTemplate from '../templates/pcrTestResult'
import {AppointmentDBModel, ResultTypes} from '../models/appointment'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {DataModelFieldMapOperatorType} from '../../../common/src/data/datamodel.base'
import {dateFormats} from '../../../common/src/utils/times'
import {makeTimeEndOfTheDay} from '../../../common/src/utils/utils'

const timeZone = Config.get('DEFAULT_TIME_ZONE')

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
    await this.handlePCRResultSaveAndSend({
      barCode: pcrResults.data.barCode,
      resultSpecs: pcrResults.data,
      adminId: pcrResults.adminId,
    })
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
      pcrTestResultsQuery.push({
        map: '/',
        key: 'deadline',
        operator: DataModelFieldMapOperatorType.Equals,
        value: makeTimeEndOfTheDay(moment.tz(`${deadline}`, 'YYYY-MM-DD', timeZone).utc()),
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

    let appointments
    if (deadline || testRunId) {
      const appointmentIds = pcrResults.map(({appointmentId}) => appointmentId)
      appointments = await this.appointmentService.getAppointmentsDBByIds(appointmentIds)
    }

    return pcrResults.map((pcr) => {
      const appointment = appointments?.find(({id}) => pcr.appointmentId === id)

      return {
        id: pcr.id,
        barCode: pcr.barCode,
        result: pcr.result,
        vialLocation: appointment?.vialLocaton,
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

  async getPCRResultsByDeadline(deadline: string): Promise<PCRTestResultByDeadlineListDTO[]> {
    const pcrResults = await this.pcrTestResultsRepository.findWhereEqual(
      'deadline',
      makeTimeEndOfTheDay(moment.tz(`${deadline}`, 'YYYY-MM-DD', timeZone).utc()),
    )

    const appointmentIds = pcrResults.map(({appointmentId}) => appointmentId)
    const appointments = await this.appointmentService.getAppointmentsDBByIds(appointmentIds)

    return pcrResults.map((pcr) => {
      const appointment = appointments.find(({id}) => pcr.appointmentId === id)
      return {
        id: pcr.id,
        barCode: appointment.barCode,
        result: pcr.result,
        vialLocation: appointment.vialLocaton,
        status: appointment.appointmentStatus,
        dateTime: appointment.dateTime,
        deadline: appointment.deadline,
        testRunId: pcr.testRunId,
      }
    })
  }

  async getTestResultsByAppointmentId(appointmentId: string): Promise<PCRTestResultDBModel[]> {
    const pcrTestResults = await this.pcrTestResultsRepository.findWhereEqual(
      'appointmentId',
      appointmentId,
    )

    if (!pcrTestResults || pcrTestResults.length == 0) {
      throw new ResourceNotFoundException(
        `PCRTestResult with appointment ${appointmentId} not found`,
      )
    }

    return pcrTestResults
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
      //CRITICAL
      console.log(
        `getWaitingPCRResultsByAppointmentId: Multiple test results found with Appointment Id: ${appointmentId} `,
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

    await this.handleActions(resultData, appointment.id)

    //Save PCR Test results
    const pcrResultDataForDbUpdate = {
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

    await this.pcrTestResultsRepository.updateProperties(testResult.id, pcrResultDataForDbUpdate)

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
    }
  }

  async createNewWaitingResult(appointment: AppointmentDBModel, adminId: string): Promise<void> {
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
    }
    await this.saveDefaultTestResults(pcrResultDataForDbCreate)
  }

  async handleActions(resultData: PCRTestResultData, appointmentId: string): Promise<void> {
    switch (resultData.resultSpecs.action) {
      case PCRResultActions.ReRunToday: {
        console.log(`TestResultReRun: ${resultData.barCode} is added to queue for today`)
        const appointment = await this.appointmentService.changeStatusToReRunRequired(
          appointmentId,
          true,
          resultData.adminId,
        )
        await this.createNewWaitingResult(appointment, resultData.adminId)
        break
      }
      case PCRResultActions.ReRunTomorrow: {
        console.log(`TestResultReRun: ${resultData.barCode} is added to queue for tomorrow`)
        const appointment = await this.appointmentService.changeStatusToReRunRequired(
          appointmentId,
          false,
          resultData.adminId,
        )
        await this.createNewWaitingResult(appointment, resultData.adminId)
        break
      }
      case PCRResultActions.RequestReSample: {
        console.log(`TestResultReSample: ${resultData.barCode} is requested`)
        const appointment = await this.appointmentService.changeStatusToReSampleRequired(
          appointmentId,
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
        await this.pcrTestResultsRepository.updateProperties(pcrTestResult.id, {organizationId}),
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
}
