import DataStore from '../../../common/src/data/datastore'
import {PulseOxygenDBModel} from '../models/pulse-oxygen'
import {PulseOxygenRepository} from '../respository/pulse-oxygen.repository'

export class PulseOxygenService {
  private dataStore = new DataStore()
  private pusleOxygenRepository = new PulseOxygenRepository(this.dataStore)

  savePulseOxygenStatus(pulseOxygen: Omit<PulseOxygenDBModel, 'id'>): Promise<PulseOxygenDBModel> {
    return this.pusleOxygenRepository.create(pulseOxygen)
  }
}
