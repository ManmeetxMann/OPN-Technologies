import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {LogInfo} from '../../../common/src/utils/logging-setup'
import DataStore from '../../../common/src/data/datastore'
import {Config} from '../../../common/src/utils/config'
import {OPNPubSub} from '../../../common/src/service/google/pub_sub'
import PassportAdapter from '../../../common/src/adapters/passport'
import {Temperature, TemperatureDBModel, TemperatureStatuses} from '../models/temperature'
import {TemperatureRepository} from '../respository/temperature.repository'
import {PassportStatuses} from '../../../passport/src/models/passport'

export class TemperatureService {
  private dataStore = new DataStore()
  private temperatureRepository = new TemperatureRepository(this.dataStore)
  private pubsub = new OPNPubSub(Config.get('TEMPERATURE_TOPIC'))
  private adapter = new PassportAdapter()
  async save(temperature: Temperature): Promise<TemperatureDBModel> {
    const temp = await this.temperatureRepository.add(temperature)
    const status =
      temp.status === TemperatureStatuses.Proceed ? PassportStatuses.Proceed : PassportStatuses.Stop
    await this.adapter.createPassport(temp.userId, temp.organizationId, status)
    this.pubsub.publish(
      {
        id: temp.id,
        status: temp.status,
        temperature: temp.temperature,
      },
      {
        userId: temp.userId,
        organizationId: temp.organizationId,
        actionType: 'created',
      },
    )
    return temp
  }

  getAllByUserAndOrgId(userId: string, organizationId: string): Promise<TemperatureDBModel[]> {
    return this.temperatureRepository
      .getQueryFindWhereEqual('userId', userId)
      .where('organizationId', '==', organizationId)
      .fetch()
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
    if (!temperature) {
      LogInfo('getByUserIdAndOrganizationId', 'NotDataAvaiable', {
        temperatureId: id,
      })
      throw new BadRequestException(`Invalid Request`)
    }

    if (temperature.organizationId !== organizationId || temperature.userId !== userId) {
      LogInfo('getByUserIdAndOrganizationId', 'NotAuthorized', {
        temperatureId: id,
        organizationId,
        userId,
      })
      throw new BadRequestException(`Not Authorized to view details`)
    }
    return temperature
  }
}
