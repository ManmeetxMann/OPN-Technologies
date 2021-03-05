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
import {LabService} from './lab.service'
import {fromPairs} from 'lodash'

export class TransportRunsService {
  private transportRunsRepository = new TransportRunsRepository(new DataStore())
  private identifier = new IdentifiersModel(new DataStore())
  private labService = new LabService()

  create(
    transportDateTime: Date,
    driverName: string,
    label: string,
    labId: string,
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
          labId,
        })
      })
      .then((transportRun: TransportRunsDbModel) => {
        return {id: transportRun.id, transportRunId: transportRun.transportRunId}
      })
  }
  async getByDate(transportDate: string): Promise<TransportRunsDbModel[]> {
    const transports = await this.transportRunsRepository.findWhereEqual(
      'transportDate',
      transportDate,
    )

    const labs = fromPairs(
      (
        await this.labService.getAllByIds(
          transports
            .map((transport: TransportRunsDbModel) => transport.labId)
            .filter((labId) => !!labId),
        )
      ).map((lab) => [lab.id, lab.name]),
    )

    return transports.map((transport) => ({
      ...transport,
      labName: labs[transport.labId],
    }))
  }
  getByTransportRunId(transportRunId: string): Promise<TransportRunsDbModel[]> {
    return this.transportRunsRepository.findWhereEqual('transportRunId', transportRunId)
  }
  getByTransportRunIdBulk(transportRunIds: string[]): Promise<TransportRunsDbModel[]> {
    return this.transportRunsRepository.findWhereIn('transportRunId', transportRunIds)
  }
}
