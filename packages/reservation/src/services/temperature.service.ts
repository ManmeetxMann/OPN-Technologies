import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {LogInfo} from '../../../common/src/utils/logging-setup'
import DataStore from '../../../common/src/data/datastore'
import {Temperature, TemperatureDBModel} from '../models/temperature'
import {TemperatureRepository} from '../respository/temperature.repository'
import {Enterprise} from '../adapter/enterprise'
import {UserService} from '../../../common/src/service/user/user-service'
import {safeTimestamp} from '../../../common/src/utils/datetime-util'

export class TemperatureService {
  private dataStore = new DataStore()
  private temperatureRepository = new TemperatureRepository(this.dataStore)
  // private pubsub = new OPNPubSub(Config.get('TEMPERATURE_TOPIC'))
  private enterpriseAdapter = new Enterprise()
  private userService = new UserService()

  async save(temperature: Temperature): Promise<TemperatureDBModel> {
    const temp = await this.temperatureRepository.add(temperature)

    this.enterpriseAdapter.postTemperature({
      id: temp.id,
      status: temp.status,
      temperature: temp.temperature,
      userId: temp.userId,
      organizationId: temp.organizationId,
    })

    return temp
  }

  getAllByUserAndOrgId(userId: string, organizationId: string): Promise<TemperatureDBModel[]> {
    return this.temperatureRepository
      .getQueryFindWhereEqual('userId', userId)
      .where('organizationId', '==', organizationId)
      .fetch()
  }

  getAllByUserId(userId: string): Promise<TemperatureDBModel[]> {
    return this.temperatureRepository.getQueryFindWhereEqual('userId', userId).fetch()
  }

  async getTemperaturesInRange(
    userId: string,
    organizationId: string,
    from: string,
    to: string,
  ): Promise<TemperatureDBModel[]> {
    return (
      this.temperatureRepository
        .collection()
        //@ts-ignore
        .where('timestamps.createdAt', '>=', safeTimestamp(from))
        //@ts-ignore
        .where('timestamps.createdAt', '<=', safeTimestamp(to))
        .where('organizationId', '==', organizationId)
        .where(`userId`, '==', userId)
        //@ts-ignore
        .orderBy('timestamps.createdAt', 'desc')
        .fetch()
    )
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

    const isParent = await this.userService.isParentForChild(userId, temperature.userId)
    const isNotParentAndAuthUser = temperature.userId !== userId && !isParent

    if (temperature.organizationId !== organizationId || isNotParentAndAuthUser) {
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
