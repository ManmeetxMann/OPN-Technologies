import DataModel from '../../../common/src/data/datamodel.base'
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
}
