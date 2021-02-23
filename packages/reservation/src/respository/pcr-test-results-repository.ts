import {serverTimestamp} from '../../../common/src/utils/times'
import DataModel, {DataModelFieldMapOperatorType} from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {PCRTestResultDBModel, ActivityTrackingDb, UpdatePcrTestResultActionParams, PcrResultTestActivityAction} from '../models/pcr-test-results'
import DBSchema from '../dbschemas/pcr-test-results.schema'

export class PCRTestResultsRepository extends DataModel<PCRTestResultDBModel> {
  public rootPath = 'pcr-test-results'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  public async save(
    data: Omit<PCRTestResultDBModel, 'id' | 'updatedAt'>,
  ): Promise<PCRTestResultDBModel> {
    const validatedData = await DBSchema.validateAsync(data)
    return this.add({...validatedData, updatedAt: serverTimestamp()})
  }

  async updateData(
    id: string,
    pcrTestResults: Partial<PCRTestResultDBModel>,
  ): Promise<PCRTestResultDBModel> {
    return await this.updateProperties(id, {...pcrTestResults, updatedAt: serverTimestamp()})
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
  ): Promise<void> {
    if (action) {
      await this.addPcrTestResultActivityById({
        id: pcrTestResults.id,
        action,
        updates: pcrTestResults
      })
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
      const skip = ['id', 'timestamps', 'appointmentStatus']

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
        console.warn(`No one field has been updated for appointmen ${id}`)
        return
      }

      return this.getPcrTestResultActivityRepository(id).add({
        action,
        newData,
        currentData,
        actionBy,
      })
    } catch (err) {
      console.warn(`Failed to create Object Difference for activity Tracking ${err}`)
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
