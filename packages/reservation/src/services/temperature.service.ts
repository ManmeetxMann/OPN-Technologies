import { BadRequestException } from '../../../common/src/exceptions/bad-request-exception'
import { LogInfo } from '../../../common/src/utils/logging-setup'
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

  async getTemperatureDetails(
    id: string,
    userId: string,
    organizationId: unknown,
  ): Promise<TemperatureDBModel> {
    const temperature = await this.temperatureRepository.get(id)
    if(!temperature){
      LogInfo('getByUserIdAndOrganizationId', 'NotDataAvaiable', {
        temperatureId: id
      })
      throw new BadRequestException(
        `Invalid Request`,
      )
    }

    if(temperature.organizationId!==organizationId || temperature.userId!==userId){
      LogInfo('getByUserIdAndOrganizationId', 'NotAuthorized', {
        temperatureId: id,
        organizationId,
        userId,
      })
      throw new BadRequestException(
        `Not Authorized to view details`,
      )
    }
    return temperature
  }
}
