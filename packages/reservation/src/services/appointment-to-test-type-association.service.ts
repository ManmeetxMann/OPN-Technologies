import DataStore from '../../../common/src/data/datastore'
import {AppointmentToTestTypeAssociation} from '../models/appointment-test-association'
import {AppointmentToTestTypeRepository} from '../respository/appointment-to-test-type-association.repository'

export class AppointmentToTestTypeAssocService {
  private dataStore = new DataStore()
  private appointmentToTestTypeRepository = new AppointmentToTestTypeRepository(this.dataStore)

  save(
    association: Omit<AppointmentToTestTypeAssociation, 'id'>,
  ): Promise<AppointmentToTestTypeAssociation> {
    return this.appointmentToTestTypeRepository.add(association)
  }
}
