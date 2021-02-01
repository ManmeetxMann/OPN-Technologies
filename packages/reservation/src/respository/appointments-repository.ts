import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {AppointmentDBModel, AppointmentStatusHistoryDb} from '../models/appointment'
import DBSchema from '../dbschemas/appointments.schema'

export class AppointmentsRepository extends DataModel<AppointmentDBModel> {
  public rootPath = 'appointments'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  public async save(appointments: Omit<AppointmentDBModel, 'id'>): Promise<AppointmentDBModel> {
    const validatedData = await DBSchema.validateAsync(appointments)
    return this.add(validatedData)
  }

  public updateBarCodeById(id: string, barCode: string): Promise<AppointmentDBModel> {
    return this.updateProperty(id, 'barCode', barCode)
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
