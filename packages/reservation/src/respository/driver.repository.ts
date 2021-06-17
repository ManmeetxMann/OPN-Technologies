import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {Driver} from '../models/driver'
import DriverChema from '../dbschemas/driver.schema'

export class DriverRepository extends DataModel<Driver> {
  public rootPath = 'drivers'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  public async addDriver(driver: Driver): Promise<Driver> {
    const driverValid = await DriverChema.validateAsync(driver)
    return this.add(driverValid)
  }

  public async updateDriver(name: string, enabled: boolean): Promise<Driver> {
    const driver = await this.findWhereEqual('name', name)[0]
    if (driver) {
      return this.updateProperty(driver.id, 'enabled', enabled)
    }
  }
}
