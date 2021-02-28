//Common
import {serverTimestamp} from '../../../common/src/utils/times'
import DataModel, {DataModelFieldMapOperatorType} from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import { Config } from '../../../common/src/utils/config'

//Models
import {PCRTestResultDBModel} from '../models/pcr-test-results'
import {AppointmentDBModel, ResultTypes, TestTypes} from '../models/appointment'
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
    await this.updateAllResultsForAppointmentId(data.appointment.id, {
      displayInResult: false,
    })
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
      testKitBatchID: (data.appointment.testType===TestTypes.RapidAntigen)?Config.get('TEST_KIT_BATCH_ID'):null
    }
    return await this.save(pcrResultDataForDb)
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
    return this.updateProperties(id, {...pcrTestResults, updatedAt: serverTimestamp()})
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
  ): Promise<void> {
    await this.updateAllFromCollectionWhereEqual('appointmentId', appointmentId, pcrTestResults)
  }
}
