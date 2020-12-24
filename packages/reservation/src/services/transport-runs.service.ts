import DataStore from '../../../common/src/data/datastore'
import {TransportRunsRepository} from '../respository/transport-runs.repository'
import {IdentifiersModel} from '../../../common/src/data/identifiers'
import {TransportRunsDbModel, TransportRunsIdentifier} from '../models/transport-runs'

export class TransportRunsService {
  private transportRunsRepository = new TransportRunsRepository(new DataStore())
  private identifier = new IdentifiersModel(new DataStore())

  create(transportDateTime: string, driverName: string): Promise<TransportRunsIdentifier> {
    return this.identifier
      .getUniqueId('transportRun')
      .then((transportRunId) => {
        return this.transportRunsRepository.add({
          transportRunId: `R${transportRunId}`,
          transportDateTime: transportDateTime,
          driverName: driverName,
        })
      })
      .then((transportRun: TransportRunsDbModel) => {
        return {id: transportRun.id, transportRunId: transportRun.transportRunId}
      })
  }
  getByDate(transportDateTime: string): Promise<TransportRunsDbModel[]> {
      return this.transportRunsRepository.findWhereEqual('transportDateTime', transportDateTime);
  }
  getByTransportRunId(transportRunId: string): Promise<TransportRunsDbModel[]> {
      return this.transportRunsRepository.findWhereEqual('transportRunId', transportRunId);
  }
}
