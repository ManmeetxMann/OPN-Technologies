import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {TransportRunsDbModel} from '../models/transport-runs'

export class TransportRunsRepository extends DataModel<TransportRunsDbModel> {
  public rootPath = 'transport-runs'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  public async save(testResults: TransportRunsDbModel): Promise<void> {
    await this.add(testResults)
  }
}
