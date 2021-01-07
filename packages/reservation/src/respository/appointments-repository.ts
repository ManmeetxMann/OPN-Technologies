import {firestore} from 'firebase-admin'

import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {AppointmentDBModel, AppointmentModelBase, AppointmentStatusHistoryDb} from '../models/appointment'

export class AppointmentsRepository extends DataModel<AppointmentDBModel> {
  public rootPath = 'appointments'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  public async save(appointments: AppointmentModelBase): Promise<AppointmentDBModel> {
    return this.add(appointments)
  }

  public updateWithUnion(
    id: string,
    data: Partial<AppointmentDBModel>,
  ): Promise<AppointmentDBModel> {
    if (data.testRunId?.length) {
      // @ts-ignore
      data.testRunId = firestore.FieldValue.arrayUnion(...data.testRunId) as string[]
    }

    return this.updateProperties(id, data)
  }
}

export class StatusHistoryRepository extends DataModel<AppointmentStatusHistoryDb> {
  public rootPath
  readonly zeroSet = []
  constructor(dataStore: DataStore, organizationId: string) {
    super(dataStore)
    this.rootPath = `appointments/${organizationId}/status-history`
  }
}