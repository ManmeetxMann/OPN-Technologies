import DataStore from '../../../common/src/data/datastore'
import {TransportRunsRepository} from '../respository/transport-runs.repository'
import {IdentifiersModel} from '../../../common/src/data/identifiers'
import {TransportRunsDbModel, TransportRunsIdentifier} from '../models/transport-runs'
import {firestore} from 'firebase-admin'
import {
  getDateFromDatetime,
  getDayFromDatetime,
  getMonthFromDatetime,
} from '../utils/datetime.helper'

export class TransportRunsService {
  private transportRunsRepository = new TransportRunsRepository(new DataStore())
  private identifier = new IdentifiersModel(new DataStore())

  create(
    transportDateTime: Date,
    driverName: string,
    label: string,
  ): Promise<TransportRunsIdentifier> {
    const transportDate = getDateFromDatetime(transportDateTime)
    const transportDay = getDayFromDatetime(transportDateTime)
    const transportMonth = getMonthFromDatetime(transportDateTime)

    return this.identifier
      .getUniqueId('transportRun')
      .then((transportRunId) => {
        return this.transportRunsRepository.add({
          transportRunId: `TRA${transportRunId}-${transportMonth}${transportDay}`,
          transportDateTime: firestore.Timestamp.fromDate(transportDateTime),
          transportDate,
          driverName,
          label,
        })
      })
      .then((transportRun: TransportRunsDbModel) => {
        return {id: transportRun.id, transportRunId: transportRun.transportRunId}
      })
  }
  getByDate(transportDate: string): Promise<TransportRunsDbModel[]> {
    return this.transportRunsRepository.findWhereEqual('transportDate', transportDate)
  }
  getByTransportRunId(transportRunId: string): Promise<TransportRunsDbModel[]> {
    return this.transportRunsRepository.findWhereEqual('transportRunId', transportRunId)
  }
  getByTransportRunIdBulk(transportRunIds: string[]): Promise<TransportRunsDbModel[]> {
    return this.transportRunsRepository.findWhereIn('transportRunId', transportRunIds)
  }
}
