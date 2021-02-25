import {serverTimestamp} from '../../../common/src/utils/times'
import DataModel, {DataModelFieldMapOperatorType} from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {PCRTestResultDBModel} from '../models/pcr-test-results'
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
