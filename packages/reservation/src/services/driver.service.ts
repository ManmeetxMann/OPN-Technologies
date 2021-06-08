import DataStore from '../../../common/src/data/datastore'
import {Driver} from '../models/driver'
import {DriverRepository} from '../respository/driver.repository'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {LogError} from '../../../common/src/utils/logging-setup'

export class DriverService {
  private dataStore = new DataStore()
  private driverRepository = new DriverRepository(this.dataStore)

  getAllEnabled(): Promise<Driver[]> {
    return this.driverRepository.findWhereEqual('enabled', true)
  }

  save(driver: Driver): Promise<Driver> {
    return this.driverRepository.findWhereEqual('name', driver.name).then((drivers) => {
      if (drivers.length) {
        LogError('AdminDriverController:addDriver', 'FailedToCreateDriver', {
          errorMessage: `Driver '${driver.name}' already exists`,
        })
        throw new BadRequestException('Driver already exists')
      }

      return this.driverRepository.addDriver(driver)
    })
  }

  update(name: string, enabled: boolean): Promise<Driver> {
    if (!name || enabled === null || enabled === undefined) {
      throw new BadRequestException('Driver name or status not provided')
    }

    return this.driverRepository.findWhereEqual('name', name).then((matches) => {
      if (!matches.length) {
        throw new BadRequestException('Driver with provided name was not found')
      }

      const targetId = matches[0].id

      return this.driverRepository.updateProperty(targetId, 'enabled', enabled)
    })
  }
}
