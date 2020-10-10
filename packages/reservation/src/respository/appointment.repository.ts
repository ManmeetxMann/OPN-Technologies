import AcuityScheduling from '../../../common/src/data/adapter.acuity'
import {AppointmentFilter} from '../models/appoinment'

export class AppoinmentsRepository extends AcuityScheduling {
  constructor() {
    super()
  }

  async getFilteredAppointments(data: AppointmentFilter): Promise<any>  {
    return this.getAppointments(data)
  }
}
