import {TemperatureDBModel} from '../models/temperature'
import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'

export class TemperatureRepository extends DataModel<TemperatureDBModel> {
    public readonly rootPath = 'temperature'
    readonly zeroSet = []

    constructor(dataStore: DataStore) {
        super(dataStore)
    }
}
  