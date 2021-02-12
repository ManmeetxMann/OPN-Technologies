import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {
  ActivityTrackingDb,
  AppointmentActivityAction,
  AppointmentDBModel,
  AppointmentStatus,
  AppointmentStatusHistoryDb,
  UpdateAppointmentActionParams,
} from '../models/appointment'
import DBSchema from '../dbschemas/appointments.schema'
import {isEqual} from 'lodash'

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

  public changeAppointmentStatus(
    appointmentId: string,
    appointmentStatus: AppointmentStatus,
  ): Promise<AppointmentDBModel> {
    return this.updateProperties(appointmentId, {
      appointmentStatus,
    })
  }

  public async updateBarCodeById(
    id: string,
    barCode: string,
    actionBy: string,
  ): Promise<AppointmentDBModel> {
    await this.addAppointmentActivityById({
      id,
      action: AppointmentActivityAction.RegenerateBarcode,
      updates: {barCode},
      actionBy,
    })

    return this.updateProperty(id, 'barCode', barCode)
  }

  public async updateAppointment({
    id,
    updates,
    action,
    actionBy,
  }: UpdateAppointmentActionParams): Promise<AppointmentDBModel> {
    const promises = []

    promises.push(this.updateProperties(id, updates))

    if (action) {
      promises.push(
        this.addAppointmentActivityById({
          id,
          action,
          updates,
          actionBy,
        }),
      )
    }

    const [appointments] = await Promise.all(promises)

    return appointments
  }

  private getAppointmentActivityRepository(appointmentId: string): ActivityTrackingRepository {
    return new ActivityTrackingRepository(new DataStore(), appointmentId)
  }

  private async addAppointmentActivityById({
    action,
    id,
    updates,
    actionBy = null,
  }: UpdateAppointmentActionParams): Promise<ActivityTrackingDb> {
    const appointment = await this.get(id)
    const currentData = {}
    const newData = {}
    const skip = ['id', 'timestamps', 'appointmentStatus']

    Object.keys(updates).map((key) => {
      // isEqual used for timestamps, !== used to avoid fouls for the same values in different formats (strings and numbers)
      if (
        !skip.includes(key) &&
        (!isEqual(updates[key], appointment[key]) || updates[key] !== appointment[key])
      ) {
        currentData[key] = appointment[key]
        newData[key] = updates[key]
      }
    })

    if (!Object.keys(newData).length) {
      console.warn(`No one field has been updated for appointmen ${id}`)
      return
    }

    return this.getAppointmentActivityRepository(id).add({
      action,
      newData,
      currentData,
      actionBy,
    })
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

export class ActivityTrackingRepository extends DataModel<ActivityTrackingDb> {
  public rootPath
  readonly zeroSet = []
  constructor(dataStore: DataStore, appointmentId: string) {
    super(dataStore)
    this.rootPath = `appointments/${appointmentId}/activity`
  }
}
