import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {AdminScanHistory} from '../models/admin-scan-history'
import DBSchema from '../dbschemas/admin-scan-history.schema'

export class AdminScanHistoryRepository extends DataModel<AdminScanHistory> {
  public rootPath = 'admin-scan-history'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  public async save(adminScanHistory: Omit<AdminScanHistory, 'id'>): Promise<AdminScanHistory> {
    const validatedData = await DBSchema.validateAsync(adminScanHistory)
    return this.add(validatedData)
  }
}
