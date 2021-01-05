import {firestore} from 'firebase-admin'

import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {AppointmentDbBase, AppointmentsDBModel} from '../models/appoinment'

export class AppointmentsRepository extends DataModel<AppointmentsDBModel> {
  public rootPath = 'appointments'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  public async save(appointments: AppointmentDbBase): Promise<AppointmentsDBModel> {
    return this.add(appointments)
  }

  public updateWithUnion(
    id: string,
    data: Partial<AppointmentsDBModel>,
  ): Promise<AppointmentsDBModel> {
    if (data.testRunId?.length) {
      // @ts-ignore
      data.testRunId = firestore.FieldValue.arrayUnion(...data.testRunId) as string[]
    }

    return this.updateProperties(id, data)
  }
}
