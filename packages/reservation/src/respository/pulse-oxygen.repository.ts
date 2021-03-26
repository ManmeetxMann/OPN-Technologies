import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {PulseOxygenDBModel} from '../models/pulse-oxygen'
import pulseOxygenSchema from '../dbschemas/pulse-oxygen.schema'

export class PulseOxygenRepository extends DataModel<PulseOxygenDBModel> {
  public readonly rootPath = 'pulse-oxygen'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  async create(pulseOxygen: Omit<PulseOxygenDBModel, 'id'>): Promise<PulseOxygenDBModel> {
    const validPulseOxygen = await pulseOxygenSchema.validateAsync(pulseOxygen)
    return this.add(validPulseOxygen)
  }
}
