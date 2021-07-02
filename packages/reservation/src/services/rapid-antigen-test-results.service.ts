import moment from 'moment'
import {Readable} from 'stream'

//Common
import DataStore from '../../../common/src/data/datastore'
import {LogError, LogInfo, LogWarning} from '../../../common/src/utils/logging-setup'
import {OPNPubSub} from '../../../common/src/service/google/pub_sub'
import {EmailService, EmailMessage} from '../../../common/src/service/messaging/email-service'
import {Config} from '../../../common/src/utils/config'

//Repository
import {AdminScanHistoryRepository} from '../respository/admin-scan-history'
import {AppointmentsRepository} from '../respository/appointments-repository'
import {PCRTestResultsRepository} from '../respository/pcr-test-results-repository'

//Models
import {AppointmentDBModel, AppointmentStatus, ResultTypes, TestTypes} from '../models/appointment'
import {BulkOperationResponse, BulkOperationStatus} from '../types/bulk-operation.type'
import {
  RapidAntigenResultTypes,
  RapidAntigenTestResultRequest,
  RapidAntigenResultPDFType,
} from '../models/rapid-antigen-test-results'

import {RapidAntigenPDFContent} from '../templates/rapid-antigen'
import {PcrResultTestActivityAction, PCRTestResultDBModel} from '../models/pcr-test-results'
import {QrService} from '../../../common/src/service/qr/qr-service'
import TestResultUploadService from '../../../enterprise/src/services/test-result-upload-service'

export class RapidAntigenTestResultsService {
  private dataStore = new DataStore()
  private adminScanHistoryRepository = new AdminScanHistoryRepository(this.dataStore)
  private appointmentsRepository = new AppointmentsRepository(this.dataStore)
  private pcrTestResultsRepository = new PCRTestResultsRepository(this.dataStore)
  private emailService = new EmailService()
  private pubSub = new OPNPubSub('rapid-antigen-test-result-topic')
  private testResultUploadService = new TestResultUploadService()

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
    await this.pcrTestResultsRepository.updateData({
      id,
      updates: {
        previousResult: result !== ResultTypes.Pending ? result : null,
        result: this.getResultBasedOnAction(action),
        waitingResult: false,
        appointmentStatus: AppointmentStatus.Reported,
      },
      actionBy: reqeustedBy,
      action: PcrResultTestActivityAction.UpdateFromRapidAntigen,
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
    const actionsWithNotifyEnabled = [
      RapidAntigenResultTypes.SendPositive,
      RapidAntigenResultTypes.SendNegative,
    ]
    if (notify && actionsWithNotifyEnabled.includes(action)) {
      this.pubSub.publish({
        appointmentID: appointmentId,
        testResultID: id,
      })
    } else {
      LogInfo('saveAndSendRapidAntigenTestTesults.processAppointment', 'NotNOtified', {
        appointmentId,
        action,
        notify,
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
      const oldResultList = await this.pcrTestResultsRepository.getPCRResultsByAppointmentId(
        appointment.id,
      )
      const [previousResult] = oldResultList.filter((result) => result.displayInResult)
      const newResult = await this.pcrTestResultsRepository.createNewTestResults({
        appointment,
        adminId: reqeustedBy,
        runNumber: 0,
        reCollectNumber: 0,
        previousResult: previousResult ? previousResult.result : ResultTypes.Pending,
      })
      return this.saveResult(action, notify, reqeustedBy, newResult)
    } else {
      //LOG Critical and Fail
      LogError('RapidAntigenTestResultsService:processAppointment', 'Failed:NoWaitingResults', {
        appointmentID: appointment.id,
      })
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
    const {appointmentID, testResultID} = (await OPNPubSub.getPublishedData(data)) as {
      appointmentID: string
      testResultID: string
    }
    const appointment = await this.appointmentsRepository.getAppointmentById(appointmentID)
    if (!appointment) {
      LogInfo('RapidAntigenTestResultsService: sendTestResultEmail', 'InvalidAppointmentId', {
        appointmentID,
      })
      return
    }
    const testResults = await this.pcrTestResultsRepository.get(testResultID)
    if (!testResults) {
      LogInfo('RapidAntigenTestResultsService: sendTestResultEmail', 'InvalidTestResultsID', {
        testResultID,
      })
      return
    }

    const fileName = this.testResultUploadService.generateFileName(testResults.id)
    const v4ReadURL = await this.testResultUploadService.getSignedInUrl(fileName)
    const qr = await QrService.generateQrCode(v4ReadURL)
    const rapidAntigenAllowedResults = [
      ResultTypes.Negative,
      ResultTypes.Positive,
      ResultTypes.Invalid,
    ]
    if (!rapidAntigenAllowedResults.includes(testResults.result)) {
      LogWarning(
        'RapidAntigenTestResultsService: sendTestResultEmail',
        'InvalidResultSendRequested',
        {
          appointmentID,
          testResultID,
          result: testResults.result,
        },
      )
      return
    }

    const emailSendStatus = await this.emailService.send(
      await this.getEmailData(appointment, testResults.result, qr, fileName),
    )

    LogInfo('RapidAntigenTestResultsService: sendTestResultEmail', 'EmailSendSuccess', {
      emailSendStatus,
    })
  }

  async getEmailData(
    appointment: AppointmentDBModel,
    result: ResultTypes,
    qr: string,
    fileName: string,
  ): Promise<EmailMessage> {
    const resultDate = moment(appointment.dateTime.toDate()).format('LL')
    const templateId =
      result === ResultTypes.Invalid
        ? Config.getInt('TEST_RESULT_INVALID_RAPID_ANTIGEN_TEMPLATE_ID')
        : Config.getInt('TEST_RESULT_RAPID_ANTIGEN_TEMPLATE_ID')
    const emailData = {
      templateId,
      to: [{email: appointment.email, name: `${appointment.firstName} ${appointment.lastName}`}],
      params: {
        BARCODE: appointment.barCode,
        DATE_OF_RESULT: resultDate,
        FIRSTNAME: appointment.firstName,
      },
      bcc: [
        {
          email: Config.get('TEST_RESULT_BCC_EMAIL'),
        },
      ],
    }

    if (result !== ResultTypes.Invalid) {
      const pdfContent = await RapidAntigenPDFContent(
        appointment,
        await this.getPDFType(appointment.id, result),
        qr,
      )
      const attachment = [
        {
          content: pdfContent,
          name: `FHHealth.ca Result - ${appointment.barCode}.pdf`,
        },
      ]

      const pdfStream = Buffer.from(pdfContent, 'base64')
      const stream = Readable.from(pdfStream)
      await this.testResultUploadService.uploadPDFResult(stream, fileName)

      return {...emailData, attachment}
    }
    return emailData
  }

  getPDFType(appointmentID: string, result: ResultTypes): RapidAntigenResultPDFType {
    if (result === ResultTypes.Negative) {
      return RapidAntigenResultPDFType.Negative
    } else if (result === ResultTypes.Positive) {
      return RapidAntigenResultPDFType.Positive
    } else {
      LogError('RapidAntigenTestResultsService: getPDFType', 'UnSupportedPDFResultType', {
        appointmentID,
        errorMessage: `NotSupported Result ${result}`,
      })
    }
  }
}
