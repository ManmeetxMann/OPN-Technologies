import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import DbSchema from '../dbschemas/appointment-to-test-type-assoc.schema'
import {AppointmentToTestTypeAssociation} from '../models/appointment-test-association'
import {TestTypes} from '../models/appointment'

export class AppointmentToTestTypeRepository extends DataModel<AppointmentToTestTypeAssociation> {
  public rootPath = 'appointment-type-to-test-type-association'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  public async save(
    association: Omit<AppointmentToTestTypeAssociation, 'id'>,
  ): Promise<AppointmentToTestTypeAssociation> {
    const validAssociation = await DbSchema.validateAsync(association)
    return this.add(validAssociation)
  }

  public async getTestType(appointmentTypeID: number): Promise<TestTypes> {
    const appointmentToTestType = await this.findWhereEqual('appointmentType', appointmentTypeID)
    return appointmentToTestType?.length ? appointmentToTestType[0].testType : TestTypes.PCR
  }
}
