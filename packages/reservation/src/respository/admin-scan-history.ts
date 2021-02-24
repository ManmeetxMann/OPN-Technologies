import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {AdminScanHistory} from '../models/admin-scan-history'

export class AdminScanHistoryRepository extends DataModel<AdminScanHistory> {
  public rootPath = 'admin-scan-history'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  public save(adminScanHistory: Omit<AdminScanHistory, 'id'>): Promise<AdminScanHistory> {
    return this.add(adminScanHistory)
  }
}
