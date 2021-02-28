import DataModel, { DataModelFieldMapOperatorType } from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import { SyncInProgressTypes, SyncProgress } from '../models/sync-progress'

export class SyncProgressRepository extends DataModel<SyncProgress> {
  public rootPath = 'sync-progress'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  public async save(type: SyncInProgressTypes, key: string): Promise<void> {
    await this.add({
      type,
      key,
      id: `${type}_${key}`
    })
  }
  
  public async deleteRecord(type: SyncInProgressTypes, key: string): Promise<void> {
    this.delete(`${type}_${key}`)
  }

  public async getByType(type: SyncInProgressTypes, key: string): Promise<SyncProgress> {
    return this.get(`${type}_${key}`)
  }
}
