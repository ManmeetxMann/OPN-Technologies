import {isEmpty} from 'lodash'
import {makeFirestoreTimestamp} from '../utils/datetime.helper'
import {now} from '../../../common/src/utils/times'
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
import {LogError, LogWarning} from '../../../common/src/utils/logging-setup'
import {findDifference} from '../utils/compare-objects'

export class AppointmentsRepository extends DataModel<AppointmentDBModel> {
  public rootPath = 'appointments'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  async getAppointmentById(appointmentId: string): Promise<AppointmentDBModel> {
    return this.get(appointmentId)
  }

  async getAppointmentsDBByIds(appointmentsIds: string[]): Promise<AppointmentDBModel[]> {
    return this.findWhereIdIn(appointmentsIds)
  }

  public async save(appointments: Omit<AppointmentDBModel, 'id'>): Promise<AppointmentDBModel> {
    const validatedData = await DBSchema.validateAsync(appointments)
    return this.add(validatedData)
  }

  public async updateData(
    id: string,
    appointment: Partial<AppointmentDBModel>,
  ): Promise<AppointmentDBModel> {
    return this.updateProperties(id, appointment)
  }

  public changeAppointmentStatus(
    appointmentId: string,
    appointmentStatus: AppointmentStatus,
  ): Promise<AppointmentDBModel> {
    return this.updateProperties(appointmentId, {
      appointmentStatus,
    })
  }

  async addStatusHistoryById(
    appointmentId: string,
    newStatus: AppointmentStatus,
    createdBy: string,
  ): Promise<AppointmentStatusHistoryDb> {
    const appointment = await this.getAppointmentById(appointmentId)
    const appointmentStatusHistory = new StatusHistoryRepository(this.datastore, appointmentId)
    return appointmentStatusHistory.add({
      newStatus: newStatus,
      previousStatus: appointment.appointmentStatus,
      createdOn: now(),
      createdBy,
    })
  }

  async changeStatusToReported(appointmentId: string, userId: string): Promise<AppointmentDBModel> {
    await this.addStatusHistoryById(appointmentId, AppointmentStatus.Reported, userId)
    return this.updateProperties(appointmentId, {
      appointmentStatus: AppointmentStatus.Reported,
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

  public setDeadlineDate(
    appointmentId: string,
    deadlineDate: moment.Moment,
  ): Promise<AppointmentDBModel> {
    return this.updateProperties(appointmentId, {
      deadline: makeFirestoreTimestamp(deadlineDate.toISOString()),
    })
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
    try {
      const appointment = await this.get(id)
      const skip = ['id', 'timestamps', 'appointmentStatus']

      const {currentData, newData} = findDifference<AppointmentDBModel>(appointment, updates, skip)

      if (isEmpty(newData, true)) {
        LogWarning('addAppointmentActivityById', 'NoAppointmentUpdates', {
          message: `No one field has been updated for appointment ${id}`,
        })
        return
      }

      await this.getAppointmentActivityRepository(id).add({
        action,
        newData,
        currentData,
        actionBy,
      })
    } catch (err) {
      LogError('addAppointmentActivityById', 'FailedFindDifference', {
        errorMessage: err.toString(),
      })
    }
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
