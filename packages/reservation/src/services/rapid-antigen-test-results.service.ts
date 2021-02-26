//Common
import DataStore from '../../../common/src/data/datastore'
import {LogError, LogInfo} from '../../../common/src/utils/logging-setup'
import {OPNPubSub} from '../../../common/src/service/google/pub_sub'

//Repository
import {AppointmentsRepository} from '../respository/appointments-repository'
import {PCRTestResultsRepository} from '../respository/pcr-test-results-repository'

//Models
import {ResultTypes} from '../models/appointment'
import {BulkOperationResponse, BulkOperationStatus} from '../types/bulk-operation.type'
import {
  RapidAntigenResultTypes,
  RapidAntigenTestResultRequest,
} from '../models/rapid-antigen-test-results'

import {RapidAntigenPDFContent} from '../templates/rapid-antigen'

export class RapidAntigenTestResultsService {
  private dataStore = new DataStore()
  private pcrTestResultsRepository = new PCRTestResultsRepository(this.dataStore)
  private appointmentsRepository = new AppointmentsRepository(this.dataStore)
  private pubSub = new OPNPubSub('rapid-alergen-test-result-topic')

  async saveRapidAntigenTestTesults(
    requestData: RapidAntigenTestResultRequest[],
    reqeustedBy: string,
  ): Promise<BulkOperationResponse[]> {
    const getResult = (action: RapidAntigenResultTypes) => {
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

    const processAppointment = async (
      appointmentRequest: RapidAntigenTestResultRequest,
    ): Promise<BulkOperationResponse> => {
      const {appointmentID, action} = appointmentRequest
      const appointmentData = await this.appointmentsRepository.getAppointmentById(
        appointmentID,
      )
      if (action === RapidAntigenResultTypes.DoNothing) {
        LogInfo('saveAndSendRapidAntigenTestTesults.processAppointment', 'Skipped', appointmentData)
        return Promise.resolve({
          id: appointmentID,
          barCode: appointmentData.barCode,
          status: BulkOperationStatus.Success,
          reason: 'Successfully Skipped',
        })
      }
      const waitingResults = await this.pcrTestResultsRepository.getWaitingPCRResultsByAppointmentId(
        appointmentData.id,
      )

      if (waitingResults && waitingResults.length > 0) {
        const waitingResult = waitingResults[0] //Only One results is expected
        //Update Test Results
        await this.pcrTestResultsRepository.updateData(waitingResult.id, {
          displayInResult: true,
          previousResult:
            waitingResult.result !== ResultTypes.Pending ? waitingResult.result : null,
          result: getResult(action),
          waitingResult: false,
        })

        //Update Appointments
        await this.appointmentsRepository.changeStatusToReported(
          appointmentID,
          reqeustedBy,
        )

        //Send Push Notification
        this.pubSub.publish({
          appointmentID: appointmentID,
        })

        LogInfo('saveAndSendRapidAntigenTestTesults.processAppointment', 'Success', appointmentData)
        return Promise.resolve({
          id: appointmentID,
          barCode: appointmentData.barCode,
          status: BulkOperationStatus.Success,
          reason: 'Successfully Reported',
        })
      } else {
        //LOG Critical and Fail
        LogError(
          'saveAndSendRapidAntigenTestTesults.processAppointment',
          'Failed:NoWaitingResults',
          appointmentData,
        )
        return Promise.resolve({
          id: appointmentID,
          barCode: appointmentData.barCode,
          status: BulkOperationStatus.Failed,
          reason: 'No Results Available',
        })
      }
    }

    const results = await Promise.all(
      requestData.map(async (appointmentRequest) => processAppointment(appointmentRequest)),
    )
    return results
  }

  async sendTestResultEmail(appointmentID: string): Promise<void> {
    console.log(`Processed: ${appointmentID}`)
    const appointment = await this.appointmentsRepository.getAppointmentById(
      appointmentID,
    )

  }
}
