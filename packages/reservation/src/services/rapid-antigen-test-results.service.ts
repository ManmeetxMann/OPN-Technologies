//Common
import DataStore from '../../../common/src/data/datastore'
import {LogError, LogInfo} from '../../../common/src/utils/logging-setup'

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

export class RapidAntigenTestResultsService {
  private dataStore = new DataStore()
  private pcrTestResultsRepository = new PCRTestResultsRepository(this.dataStore)
  private appointmentsRepository = new AppointmentsRepository(this.dataStore)

  async saveAndSendRapidAntigenTestTesults(
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
        case RapidAntigenResultTypes.SendInconclusive: {
          return ResultTypes.Inconclusive
        }
      }
    }

    const processAppointment = async (
      appointment: RapidAntigenTestResultRequest,
    ): Promise<BulkOperationResponse> => {
      const appointmentData = await this.appointmentsRepository.getAppointmentById(
        appointment.appointmentID,
      )
      if (appointment.action === RapidAntigenResultTypes.DoNothing) {
        LogInfo('saveAndSendRapidAntigenTestTesults.processAppointment', 'Skipped', appointmentData)
        return Promise.resolve({
          id: appointment.appointmentID,
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
          result: getResult(appointment.action),
          waitingResult: false,
        })
        await this.appointmentsRepository.changeStatusToReported(
          appointment.appointmentID,
          reqeustedBy,
        )
        LogInfo('saveAndSendRapidAntigenTestTesults.processAppointment', 'Success', appointmentData)
        return Promise.resolve({
          id: appointment.appointmentID,
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
          id: appointment.appointmentID,
          barCode: appointmentData.barCode,
          status: BulkOperationStatus.Failed,
          reason: 'No Results Available',
        })
      }
    }

    const results = await Promise.all(
      requestData.map(async (appointment) => processAppointment(appointment)),
    )
    return results
  }
}
