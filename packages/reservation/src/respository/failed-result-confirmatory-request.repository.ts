import DataModel, {DataModelFieldMapOperatorType} from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import DbSchema from '../dbschemas/failed-result-confirmatory-request.schema'
import {FailedResultConfirmatoryRequest} from '../models/failed-result-confirmatory-request'

export class FailedResultConfirmatoryRequestRepository extends DataModel<FailedResultConfirmatoryRequest> {
  public rootPath = 'failed-result-confirmatory-request'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  public async getAll(): Promise<FailedResultConfirmatoryRequest[]> {
    return this.fetchAll()
  }

  public async save(
    failedResultConfirmatoryRequest: Omit<FailedResultConfirmatoryRequest, 'id'>,
  ): Promise<void> {
    const validResultConfirmatory = await DbSchema.validateAsync(failedResultConfirmatoryRequest)
    await this.add(validResultConfirmatory)
  }

  public async saveOrUpdate(
    failedResultConfirmatoryRequest: Omit<FailedResultConfirmatoryRequest, 'id'>,
  ): Promise<void> {
    const results = await this.findWhereEqualInMap([
      {
        map: '/',
        key: 'appointmentId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: failedResultConfirmatoryRequest.appointmentId,
      },
      {
        map: '/',
        key: 'resultId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: failedResultConfirmatoryRequest.appointmentId,
      },
    ])

    if (results.length > 0) {
      await this.update({...failedResultConfirmatoryRequest, id: results[0].id})
      return
    }

    await this.add(failedResultConfirmatoryRequest)
  }
}
