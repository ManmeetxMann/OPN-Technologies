import {PackageBase} from '../models/packages'
import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'

export class PackageRepository extends DataModel<PackageBase> {
  public rootPath = 'packages'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  public async save(testResults: PackageBase): Promise<void> {
    await this.add(testResults)
  }
}
