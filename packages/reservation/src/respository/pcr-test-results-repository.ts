//Common
import {serverTimestamp} from '../../../common/src/utils/times'
import DataModel, {DataModelFieldMapOperatorType} from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {isEqual} from 'lodash'

//Models
import {
  PCRTestResultDBModel,
  ActivityTrackingDb,
  UpdatePcrTestResultActionParams,
  PcrResultTestActivityAction,
} from '../models/pcr-test-results'
import {AppointmentDBModel, ResultTypes} from '../models/appointment'
//Schema
import DBSchema from '../dbschemas/pcr-test-results.schema'
import {getFirestoreTimeStampDate} from '../utils/datetime.helper'

export class PCRTestResultsRepository extends DataModel<PCRTestResultDBModel> {
  public rootPath = 'pcr-test-results'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  async createNewTestResults(data: {
    appointment: AppointmentDBModel
    adminId: string
    linkedBarCodes?: string[]
    reCollectNumber: number
    runNumber: number
    result?: ResultTypes
    waitingResult?: boolean
    confirmed?: boolean
    previousResult: ResultTypes
  }): Promise<PCRTestResultDBModel> {
    //Reset Display for all OLD results
    await this.updateAllResultsForAppointmentId(
      data.appointment.id,
      {
        displayInResult: false,
      },
      PcrResultTestActivityAction.ResetOldResults,
      data.adminId,
    )
    console.log(
      `createNewTestResults: UpdatedAllResults for AppointmentId: ${data.appointment.id} to displayInResult: false`,
    )

    const pcrResultDataForDb = {
      adminId: data.adminId,
      appointmentId: data.appointment.id,
      barCode: data.appointment.barCode,
      confirmed: data.confirmed ?? false,
      dateTime: data.appointment.dateTime,
      displayInResult: true,
      deadline: data.appointment.deadline,
      firstName: data.appointment.firstName,
      lastName: data.appointment.lastName,
      linkedBarCodes: data.linkedBarCodes ?? [],
      organizationId: data.appointment.organizationId,
      previousResult: data.previousResult,
      result: data.result ?? ResultTypes.Pending,
      runNumber: data.runNumber,
      reCollectNumber: data.reCollectNumber,
      waitingResult: data.waitingResult ?? true,
      recollected: false,
      deadlineDate: getFirestoreTimeStampDate(data.appointment.deadline),
      dateOfAppointment: getFirestoreTimeStampDate(data.appointment.dateTime),
    }
    return await this.save(pcrResultDataForDb)
  }

  public async save(
    data: Omit<PCRTestResultDBModel, 'id' | 'updatedAt'>,
  ): Promise<PCRTestResultDBModel> {
    const validatedData = await DBSchema.validateAsync(data)
    return this.add({...validatedData, updatedAt: serverTimestamp()})
  }

  async updateData({
    id,
    updates,
    action,
    actionBy,
  }: UpdatePcrTestResultActionParams): Promise<PCRTestResultDBModel> {
    if (action) {
      await this.addPcrTestResultActivityById({
        id,
        action,
        updates,
        actionBy,
      })
    }

    return await this.updateProperties(id, {...updates, updatedAt: serverTimestamp()})
  }

  async getWaitingPCRResultsByAppointmentId(
    appointmentId: string,
  ): Promise<PCRTestResultDBModel[]> {
    const pcrTestResultsQuery = [
      {
        map: '/',
        key: 'appointmentId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: appointmentId,
      },
      {
        map: '/',
        key: 'waitingResult',
        operator: DataModelFieldMapOperatorType.Equals,
        value: true,
      },
    ]
    const pcrTestResults = await this.findWhereEqualInMap(pcrTestResultsQuery)

    if (pcrTestResults.length > 1) {
      //TODO
      //CRITICAL
      console.log(
        `getWaitingPCRResultsByAppointmentId: Multiple test results found with Appointment Id: ${appointmentId} `,
      )
    }

    return pcrTestResults
  }

  async updateAllResultsForAppointmentId(
    appointmentId: string,
    pcrTestResults: Partial<PCRTestResultDBModel>,
    action: PcrResultTestActivityAction,
    actionBy?: string,
  ): Promise<void> {
    if (action) {
      const [pcrTestResult] = await this.findWhereEqual('appointmentId', appointmentId)

      if (pcrTestResult?.id) {
        await this.addPcrTestResultActivityById({
          id: pcrTestResult.id,
          action,
          updates: pcrTestResults,
          actionBy,
        })
      }
    }
    await this.updateAllFromCollectionWhereEqual('appointmentId', appointmentId, pcrTestResults)
  }

  private getPcrTestResultActivityRepository(pcrTestId: string): ActivityTrackingRepository {
    return new ActivityTrackingRepository(new DataStore(), pcrTestId)
  }

  private async addPcrTestResultActivityById({
    action,
    id,
    updates,
    actionBy = null,
  }: UpdatePcrTestResultActionParams): Promise<ActivityTrackingDb> {
    try {
      const pcrTestResults = await this.get(id)
      const currentData = {}
      const newData = {}
      const skip = ['id', 'timestamps']

      if (!pcrTestResults) {
        console.warn(`[PCR-Test-Result repository]: Pcr-test-result ${id} not found`)

        return
      }

      Object.keys(updates).map((key) => {
        // isEqual used for timestamps, != used to avoid fouls for the same values in different formats (boolean, strings and numbers)
        if (
          !skip.includes(key) &&
          ((typeof updates[key] === 'object' && !isEqual(updates[key], pcrTestResults[key])) ||
            (typeof updates[key] !== 'object' &&
              typeof pcrTestResults[key] !== 'object' &&
              updates[key] != pcrTestResults[key]))
        ) {
          currentData[key] = pcrTestResults[key] ?? null
          newData[key] = updates[key] ?? null
        }
      })

      if (!Object.keys(newData).length) {
        console.warn(
          `[PCR-Test-Result repository]: No one field has been updated for pcr-test-result ${id}`,
        )
        return
      }

      return this.getPcrTestResultActivityRepository(id).add({
        action,
        newData,
        currentData,
        actionBy,
      })
    } catch (err) {
      console.warn(
        `[PCR-Test-Result repository]: Failed to create Object Difference for activity Tracking ${err}`,
      )
    }
  }
}

export class ActivityTrackingRepository extends DataModel<ActivityTrackingDb> {
  public rootPath
  readonly zeroSet = []
  constructor(dataStore: DataStore, appointmentId: string) {
    super(dataStore)
    this.rootPath = `pcr-test-results/${appointmentId}/activity`
  }
}
