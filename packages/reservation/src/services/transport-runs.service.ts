import DataStore from '../../../common/src/data/datastore'
import {TransportRunsRepository} from '../respository/transport-runs.repository'
import {IdentifiersModel} from '../../../common/src/data/identifiers'
import {TransportRunsDbModel, TransportRunsIdentifier} from '../models/transport-runs'
import moment from 'moment'

export class TransportRunsService {
  private transportRunsRepository = new TransportRunsRepository(new DataStore())
  private identifier = new IdentifiersModel(new DataStore())

  create(transportDateTime: string, driverName: string): Promise<TransportRunsIdentifier> {
    const transportDate = moment(transportDateTime).utc().format('YYYY-MM-DD')
    const transportDateTimeUTC = moment(transportDateTime).utc().toString()
    return this.identifier
      .getUniqueId('transportRun')
      .then((transportRunId) => {
        return this.transportRunsRepository.add({
          transportRunId: `R${transportRunId}`,
          transportDateTime: transportDateTimeUTC,
          transportDate: transportDate,
          driverName: driverName,
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
}