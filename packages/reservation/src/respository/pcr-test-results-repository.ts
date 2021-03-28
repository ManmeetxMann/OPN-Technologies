import {isEmpty} from 'lodash'
//Common
import {serverTimestamp} from '../../../common/src/utils/times'
import DataModel, {DataModelFieldMapOperatorType} from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {Config} from '../../../common/src/utils/config'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {LogError, LogWarning} from '../../../common/src/utils/logging-setup'
//Models
import {
  PCRTestResultDBModel,
  ActivityTrackingDb,
  UpdatePcrTestResultActionParams,
  PcrResultTestActivityAction,
  getSortOrderByResult,
} from '../models/pcr-test-results'
import {AppointmentDBModel, ResultTypes} from '../models/appointment'
//Schema
import DBSchema from '../dbschemas/pcr-test-results.schema'
// Utils
import {getFirestoreTimeStampDate} from '../utils/datetime.helper'
import {findDifference} from '../utils/compare-objects'

export class PCRTestResultsRepository extends DataModel<PCRTestResultDBModel> {
  public rootPath = 'pcr-test-results'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  async getReCollectedTestResultByBarCode(barCodeNumber: string): Promise<PCRTestResultDBModel> {
    const pcrTestResultsQuery = [
      {
        map: '/',
        key: 'barCode',
        operator: DataModelFieldMapOperatorType.Equals,
        value: barCodeNumber,
      },
      {
        map: '/',
        key: 'recollected',
        operator: DataModelFieldMapOperatorType.Equals,
        value: true,
      },
    ]
    const pcrTestResults = await this.findWhereEqualInMap(pcrTestResultsQuery)

    if (!pcrTestResults || pcrTestResults.length === 0) {
      throw new ResourceNotFoundException(
        `PCRTestResult with barCode ${barCodeNumber} and ReCollect Requested not found`,
      )
    }

    //Only one Result should be waiting
    return pcrTestResults[0]
  }

  async createNewTestResults(data: {
    appointment: AppointmentDBModel
    adminId: string
    labId?: string
    templateId?: string
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
      testType: data.appointment.testType,
      testKitBatchID: this.getTestBatchId(data.appointment.appointmentTypeID),
      userId: data.appointment.userId,
      sortOrder: getSortOrderByResult(data.result ?? ResultTypes.Pending),
      labId: data.labId || null,
      templateId: data.templateId || null,
      appointmentStatus: data.appointment.appointmentStatus,
    }
    return await this.save(pcrResultDataForDb)
  }

  private getTestBatchId(appointmentTypeId: number): string {
    if (appointmentTypeId === Number(Config.get('ACUITY_APPOINTMENT_TYPE_ID'))) {
      return Config.get('TEST_KIT_BATCH_ID')
    } else if (appointmentTypeId === Number(Config.get('ACUITY_APPOINTMENT_TYPE_MULTIPLEX'))) {
      return Config.get('TEST_KIT_BATCH_MULTIPLEX_ID')
    }
    return null
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
      this.addPcrTestResultActivityById({
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
      this.findWhereEqual('appointmentId', appointmentId).then(([pcrTestResult]) => {
        if (pcrTestResult?.id) {
          this.addPcrTestResultActivityById({
            id: pcrTestResult.id,
            action,
            updates: pcrTestResults,
            actionBy,
          })
        }
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
      const skip = ['id', 'timestamps']

      if (!pcrTestResults) {
        console.warn(`[PCR-Test-Result repository]: Pcr-test-result ${id} not found`)

        return
      }

      const {currentData, newData} = findDifference<PCRTestResultDBModel>(
        pcrTestResults,
        updates,
        skip,
      )

      if (isEmpty(newData, true)) {
        LogWarning('addPcrTestResultActivityById', 'NoPCRTestResultUpdates', {
          message: `No one field has been updated for pcr-test-result ${id}`,
        })
        return
      }

      return this.getPcrTestResultActivityRepository(id).add({
        action,
        newData,
        currentData,
        actionBy,
      })
    } catch (err) {
      LogError('addPcrTestResultActivityById', 'FailedFindDifference', {
        errorMessage: err.toString(),
      })
    }
  }
}

export class ActivityTrackingRepository extends DataModel<ActivityTrackingDb> {
  public rootPath
  readonly zeroSet = []
  constructor(dataStore: DataStore, pcrTestResultsId: string) {
    super(dataStore)
    this.rootPath = `pcr-test-results/${pcrTestResultsId}/activity`
  }
}
