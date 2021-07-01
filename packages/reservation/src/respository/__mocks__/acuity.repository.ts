import {AppointmentTypes} from '../../models/appointment-types'

export class AcuityRepository {
  async getAppointmentByIdFromAcuity(_id: number): Promise<boolean> {
    return true
  }
  async cancelAppointmentByIdOnAcuity(_id: number): Promise<{canceled: boolean}> {
    return {canceled: true}
  }
  async getAppointmentTypeList(): Promise<AppointmentTypes[]> {
    return [
      {
        id: 1,
        type: '2',
        name: 'Appointment 1',
        calendarIDs: [1],
        description: 'Lorem',
        price: '100',
        category: '1',
        active: true,
        duration: 1,
        private: false,
      },
    ]
  }
}
