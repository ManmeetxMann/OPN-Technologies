import {DataModelFieldMapOperatorType} from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {Temperature, TemperatureDBModel} from '../models/temperature'
import {TemperatureRepository} from '../respository/temperature.repository'

export class TemperatureService {
  private dataStore = new DataStore()
  private temperatureRepository = new TemperatureRepository(this.dataStore)

  save(temperature: Temperature): Promise<TemperatureDBModel> {
    return this.temperatureRepository.add(temperature)
  }

  getAll(): Promise<TemperatureDBModel[]> {
    return this.temperatureRepository.fetchAll()
  }

  get(id: string): Promise<TemperatureDBModel> {
    return this.temperatureRepository.get(id)
  }

  getByUserIdAndOrganizationId(
    userId: string,
    organizationId: string,
  ): Promise<TemperatureDBModel[]> {
    const query = []
    if (userId) {
      query.push({
        map: '/',
        key: 'userId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: userId,
      })
    }

    if (organizationId) {
      query.push({
        map: '/',
        key: 'organizationId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: organizationId,
      })
    }
    return this.temperatureRepository.findWhereEqualInMap(query)
  }
}
