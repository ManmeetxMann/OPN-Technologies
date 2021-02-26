import { LogInfo } from '../../../common/src/utils/logging-setup'
import DataModel, { DataModelFieldMapOperatorType } from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'

import DBSchema from '../dbschemas/admin-scan-history.schema'

//Models
import {AdminScanHistory} from '../models/admin-scan-history'
import { TestTypes } from '../models/appointment'

export class AdminScanHistoryRepository extends DataModel<AdminScanHistory> {
  public rootPath = 'admin-scan-history'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }
  async getScanHistoryForAppointmentID(adminId: string, appointmentId: string, type:TestTypes): Promise<AdminScanHistory[]> {
    return await this.findWhereEqualInMap([
      {
        map: '/',
        key: 'appointmentId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: appointmentId,
      },
      {
        map: '/',
        key: 'createdBy',
        operator: DataModelFieldMapOperatorType.Equals,
        value: adminId,
      },
      {
        map: '/',
        key: 'type',
        operator: DataModelFieldMapOperatorType.Equals,
        value: type,
      },
    ])
  }

  public async deleteScanRecord(adminId: string, appointmentId: string, type:TestTypes): Promise<void> {
    const scanHistoryForAppointmentId= await this.getScanHistoryForAppointmentID(adminId, appointmentId, type)
    if(scanHistoryForAppointmentId && scanHistoryForAppointmentId.length > 0){
      scanHistoryForAppointmentId.forEach(async (scanRecord)=>await this.delete(scanRecord.id))
    }else{
      LogInfo('AdminScanHistoryRepository: deleteScanRecord', 'NoRecordForAppointmentAndUser', {
        adminId,
        appointmentId,
        type
      })
    }
  }

  public async save(adminScanHistory: Omit<AdminScanHistory, 'id'>): Promise<AdminScanHistory> {
    const validatedData = await DBSchema.validateAsync(adminScanHistory)
    return this.add(validatedData)
  }
}
