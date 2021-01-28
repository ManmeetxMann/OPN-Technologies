import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {AppointmentDBModel, AppointmentStatusHistoryDb} from '../models/appointment'

export class AppointmentsRepository extends DataModel<AppointmentDBModel> {
  public rootPath = 'appointments'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  public async save(appointments: Omit<AppointmentDBModel, 'id'>): Promise<AppointmentDBModel> {
    return this.add(appointments)
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
