import DataStore from '../../../common/src/data/datastore'
import {AppointmentToTestTypeAssociation} from '../models/appointment-test-association'
import {AppointmentToTestTypeRepository} from '../respository/appointment-to-test-type-association.repository'
import {AcuityRepository} from '../respository/acuity.repository'

export class AppointmentToTestTypeAssocService {
  private dataStore = new DataStore()
  private appointmentToTestTypeRepository = new AppointmentToTestTypeRepository(this.dataStore)
  private acuityRepository = new AcuityRepository()

  async save(
    association: Omit<AppointmentToTestTypeAssociation, 'id'>,
  ): Promise<AppointmentToTestTypeAssociation> {
    const appointmentTypes = await this.acuityRepository.getAppointmentTypeList()

    const appointmentType = appointmentTypes.find(
      ({id}) => id === Number(association.appointmentType),
    )

    return this.appointmentToTestTypeRepository.add({
      ...association,
      appointmentTypeName: appointmentType ? appointmentType.name : '',
    })
  }

  getAll(): Promise<AppointmentToTestTypeAssociation[]> {
    return this.appointmentToTestTypeRepository.fetchAll()
  }
}
