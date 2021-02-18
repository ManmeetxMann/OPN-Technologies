import DataStore from '../../../common/src/data/datastore'
import {Temperature, TemperatureDBModel} from '../models/temperature'
import {TemperatureRepository} from '../respository/temperature.repository'

export class TemperatureService {
  private dataStore = new DataStore()
  private temperatureRepository = new TemperatureRepository(this.dataStore)

  save(temperature: Temperature): Promise<TemperatureDBModel> {
    return this.temperatureRepository.add(temperature)
  }

  getAll(): Promise<TemperatureDBModel[]>{
    return this.temperatureRepository.fetchAll();
  }

  get(id:string): Promise<TemperatureDBModel>{
    return this.temperatureRepository.get(id);
  }

  getByUserIdAndOrganizationId(userId:string, organizationId:string): Promise<TemperatureDBModel[]>{
    let fields=[];
    if(userId){
      fields.push({
        property: 'userId',
        value: userId,
      });
    }

    if(organizationId){
      fields.push({
        property: 'organizationId',
        value: organizationId,
      });
    }
    
    return this.temperatureRepository.findWhereFieldsAreEqual(fields);
  }
}
