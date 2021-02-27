import moment from 'moment'

//Common
import DataStore from '../../../common/src/data/datastore'
import {LogError, LogInfo, LogWarning} from '../../../common/src/utils/logging-setup'
import {OPNPubSub} from '../../../common/src/service/google/pub_sub'
import {EmailService} from '../../../common/src/service/messaging/email-service'
import {Config} from '../../../common/src/utils/config'

//Repository
import {AdminScanHistoryRepository} from '../respository/admin-scan-history'
import {AppointmentsRepository} from '../respository/appointments-repository'
import {PCRTestResultsRepository} from '../respository/pcr-test-results-repository'

//Models
import {AppointmentStatus, ResultTypes, TestTypes} from '../models/appointment'
import {BulkOperationResponse, BulkOperationStatus} from '../types/bulk-operation.type'
import {
  RapidAntigenResultTypes,
  RapidAntigenTestResultRequest,
  RapidAlergenResultPDFType,
} from '../models/rapid-antigen-test-results'
import {PCRTestResultDBModel} from '../models/pcr-test-results'

import {RapidAntigenPDFContent} from '../templates/rapid-antigen'

export class RapidAntigenTestResultsService {
  private dataStore = new DataStore()
  private adminScanHistoryRepository = new AdminScanHistoryRepository(this.dataStore)
  private appointmentsRepository = new AppointmentsRepository(this.dataStore)
  private pcrTestResultsRepository = new PCRTestResultsRepository(this.dataStore)
  private emailService = new EmailService()
  private pubSub = new OPNPubSub('rapid-alergen-test-result-topic')

  private getResultBasedOnAction = (action: RapidAntigenResultTypes) => {
    switch (action) {
      case RapidAntigenResultTypes.SendNegative: {
        return ResultTypes.Negative
      }
      case RapidAntigenResultTypes.SendPositive: {
        return ResultTypes.Positive
      }
      case RapidAntigenResultTypes.SendInvalid: {
        return ResultTypes.Invalid
      }
    }
  }

  private saveResult = async (
    action: RapidAntigenResultTypes,
    notify: boolean,
    reqeustedBy: string,
    testResult: PCRTestResultDBModel,
  ): Promise<BulkOperationResponse> => {
    const {id, result, appointmentId, barCode} = testResult
    //Update Test Results
    await this.pcrTestResultsRepository.updateData(id, {
      displayInResult: true,
      previousResult: result !== ResultTypes.Pending ? result : null,
      result: this.getResultBasedOnAction(action),
      waitingResult: false,
    })

    //Update Appointments
    await this.appointmentsRepository.changeStatusToReported(appointmentId, reqeustedBy)

    //Remove Sent Result from Scan List
    await this.adminScanHistoryRepository.deleteScanRecord(
      reqeustedBy,
      appointmentId,
      TestTypes.RapidAntigen,
    )

    //Send Push Notification
    if (notify) {
      this.pubSub.publish({
        appointmentID: appointmentId,
      })
    }

    LogInfo('saveAndSendRapidAntigenTestTesults.processAppointment', 'Success', {
      appointmentId,
      resultId: id,
    })
    return Promise.resolve({
      id: appointmentId,
      barCode: barCode,
      status: BulkOperationStatus.Success,
      reason: 'Successfully Reported',
    })
  }

  private processAppointment = async (
    appointmentRequest: RapidAntigenTestResultRequest,
    reqeustedBy: string,
  ): Promise<BulkOperationResponse> => {
    const {appointmentID, action, sendAgain, notify} = appointmentRequest

    const appointment = await this.appointmentsRepository.getAppointmentById(appointmentID)
    if (!appointment) {
      LogInfo('RapidAntigenTestResultsService:processAppointment', 'InvalidAppointmentId', {
        appointmentID,
      })
      return Promise.resolve({
        id: appointmentID,
        status: BulkOperationStatus.Failed,
        reason: 'Bad Request',
      })
    }

    if (action === RapidAntigenResultTypes.DoNothing) {
      LogInfo('RapidAntigenTestResultsService:processAppointment', 'Skipped', {appointmentID})
      return Promise.resolve({
        id: appointmentID,
        barCode: appointment.barCode,
        status: BulkOperationStatus.Success,
        reason: 'Successfully Skipped',
      })
    }

    if (sendAgain && appointment.appointmentStatus !== AppointmentStatus.Reported) {
      return Promise.resolve({
        id: appointmentID,
        barCode: appointment.barCode,
        status: BulkOperationStatus.Failed,
        reason: 'Send Again Not Allowed',
      })
    }

    if (!sendAgain && appointment.appointmentStatus === AppointmentStatus.Reported) {
      return Promise.resolve({
        id: appointmentID,
        barCode: appointment.barCode,
        status: BulkOperationStatus.Failed,
        reason: 'Already Reported',
      })
    }

    if (!sendAgain && appointment.appointmentStatus !== AppointmentStatus.InProgress) {
      return Promise.resolve({
        id: appointmentID,
        barCode: appointment.barCode,
        status: BulkOperationStatus.Failed,
        reason: 'Not In Progress',
      })
    }

    const waitingResults = await this.pcrTestResultsRepository.getWaitingPCRResultsByAppointmentId(
      appointment.id,
    )

    if (waitingResults && waitingResults.length > 0) {
      const waitingResult = waitingResults[0] //Only One results is expected
      return this.saveResult(action, notify, reqeustedBy, waitingResult)
    } else if (sendAgain) {
      const newResult = await this.pcrTestResultsRepository.createNewTestResults({
        appointment,
        adminId: reqeustedBy,
        runNumber: 0,
        reCollectNumber: 0,
        previousResult: ResultTypes.Pending,
      })
      return this.saveResult(action, notify, reqeustedBy, newResult)
    } else {
      //LOG Critical and Fail
      LogError(
        'RapidAntigenTestResultsService:processAppointment',
        'Failed:NoWaitingResults',
        appointment,
      )
      return Promise.resolve({
        id: appointmentID,
        barCode: appointment.barCode,
        status: BulkOperationStatus.Failed,
        reason: 'No Results Available',
      })
    }
  }

  async saveRapidAntigenTestTesults(
    requestData: RapidAntigenTestResultRequest[],
    reqeustedBy: string,
  ): Promise<BulkOperationResponse[]> {
    const results = await Promise.all(
      requestData.map(async (appointmentRequest) =>
        this.processAppointment(appointmentRequest, reqeustedBy),
      ),
    )
    return results
  }

  async sendTestResultEmail(data: string): Promise<void> {
    const {appointmentID} = (await this.pubSub.getPublishedData(data)) as {appointmentID: string}
    const appointment = await this.appointmentsRepository.getAppointmentById(appointmentID)
    if (!appointment) {
      LogInfo('RapidAntigenTestResultsService: sendTestResultEmail', 'InvalidAppointmentId', {
        appointmentID,
      })
      return
    }

    const rapidAlergenAllowedResults = [
      ResultTypes.Negative,
      ResultTypes.Positive,
      ResultTypes.Invalid,
    ]
    if (!rapidAlergenAllowedResults.includes(appointment.latestResult)) {
      LogWarning(
        'RapidAntigenTestResultsService: sendTestResultEmail',
        'InvalidResultSendRequested',
        {
          appointmentID,
          result: appointment.latestResult,
        },
      )
      return
    }

    const resultDate = moment(appointment.dateTime.toDate()).format('LL')

    let pdfResultType: RapidAlergenResultPDFType = null
    if (appointment.latestResult === ResultTypes.Negative) {
      pdfResultType = RapidAlergenResultPDFType.Negative
    } else if (appointment.latestResult === ResultTypes.Positive) {
      pdfResultType = RapidAlergenResultPDFType.Positive
    }

    const pdfContent = await RapidAntigenPDFContent(appointment, pdfResultType)
    const attachment = [
      {
        content: pdfContent,
        name: `FHHealth.ca Result - ${appointment.barCode} - ${resultDate}.pdf`,
      },
    ]

    await this.emailService.send({
      templateId: Config.getInt('TEST_RESULT_RAPID_ANTIGEN_TEMPLATE_ID'),
      to: [{email: appointment.email, name: `${appointment.firstName} ${appointment.lastName}`}],
      params: {
        BARCODE: appointment.barCode,
        DATE_OF_RESULT: resultDate,
        FIRSTNAME: appointment.firstName,
      },
      attachment,
      bcc: [
        {
          email: Config.get('TEST_RESULT_BCC_EMAIL'),
        },
      ],
    })
  }
}
