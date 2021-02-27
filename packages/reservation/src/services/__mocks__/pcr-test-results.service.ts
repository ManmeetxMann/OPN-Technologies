import {
  PCRTestResultDBModel,
} from '../../models/pcr-test-results'

import {
  AppointmentDBModel, ResultTypes,
} from '../../models/appointment'
import { dateToDateTime } from '../../utils/datetime.helper'

export class PCRTestResultsService {
  public async createNewPCRTestForWebhook(
    appointment: AppointmentDBModel,
  ): Promise<PCRTestResultDBModel> {
    // @ts-ignore 
    return {
      appointmentId: '1',
      adminId:'1',
      barCode:'BAR12',
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
