import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {AppointmentToTestTypeAssociation} from '../models/appointment-test-association'

export class AppointmentToTestTypeRepository extends DataModel<AppointmentToTestTypeAssociation> {
  public rootPath = 'appointment-type-to-test-type-association'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  public async save(
    association: Omit<AppointmentToTestTypeAssociation, 'id'>,
  ): Promise<AppointmentToTestTypeAssociation> {
    return this.add(association)
  }
}
