import {serverTimestamp} from '../../../common/src/utils/times'
import DataModel, {DataModelFieldMapOperatorType} from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {PCRTestResultDBModel} from '../models/pcr-test-results'
import DBSchema from '../dbschemas/pcr-test-results.schema'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'

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

  async getTestResultByAppointmentId(appointmentId: string): Promise<PCRTestResultDBModel> {
    const testResults = await this.findWhereEqual('appointmentId', appointmentId)

    if (!testResults || testResults.length === 0) {
      throw new ResourceNotFoundException(
        `PCRTestResult with appointment ${appointmentId} not found`,
      )
    }

    if (testResults.length > 1) {
      console.log(
        `getTestResultByAppointmentId: Multiple test results found with Appointment Id: ${appointmentId} `,
      )
    }

    return testResults[0]
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
}
