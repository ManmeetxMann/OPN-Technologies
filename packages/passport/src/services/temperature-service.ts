import DataStore from '../../../common/src/data/datastore'
import {Temperature, TemperatureModel, TemperatureDBModel} from '../models/temperature'

export class TemperatureService {
  private dataStore = new DataStore()
  private temperatureRepository = new TemperatureModel(this.dataStore)

  save(temperature: Temperature): Promise<TemperatureDBModel> {
    return this.temperatureRepository.add(temperature)
  }
}
