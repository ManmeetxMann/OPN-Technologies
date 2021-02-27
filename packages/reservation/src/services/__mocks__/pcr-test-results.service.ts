import {PCRTestResultDBModel} from '../../models/pcr-test-results'

import {AppointmentDBModel, ResultTypes} from '../../models/appointment'

export class PCRTestResultsService {
  public async createNewTestResult(
    appointment: AppointmentDBModel,
  ): Promise<PCRTestResultDBModel> {
    console.log(appointment)
    // @ts-ignore
    return {
      appointmentId: '1',
      adminId: '1',
      barCode: 'BAR12',
      confirmed: false,
      displayInResult: true,
      firstName: 'string',
      id: 'string',
      lastName: 'string',
      linkedBarCodes: [],
      recollected: false,
      reCollectNumber: 1,
      runNumber: 2,
      waitingResult: true,
      result: ResultTypes.Pending,
      previousResult: ResultTypes.Pending,
    }
  }
}
