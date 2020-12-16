import DataStore from '../../../common/src/data/datastore'
import {Temperature, TemperatureDBModel} from '../models/temperature'
import {TemperatureRepository} from '../repository/temperature.repository'

export class TemperatureService {
  private dataStore = new DataStore()
  private temperatureRepository = new TemperatureRepository(this.dataStore)

  save(temperature: Temperature): Promise<TemperatureDBModel> {
    return this.temperatureRepository.add(temperature)
  }
}
