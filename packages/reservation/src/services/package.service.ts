import DataStore from '../../../common/src/data/datastore'

import {PackageBase} from '../models/packages'
import {PackageRepository} from '../respository/package.repository'

export class PackageService {
  private packageRepository = new PackageRepository(new DataStore())

  async getAllByOrganizationId(organizationId: string): Promise<PackageBase[]> {
    return this.packageRepository.findWhereEqual('organizationId', organizationId)
  }

  async savePackage(packageCode: string, organizationId: string = null): Promise<void> {
    if (!packageCode) {
      console.warn(`No packageCode`)
    }

    await this.packageRepository.add({
      packageCode: packageCode,
      organizationId,
    })

    if (!organizationId) {
      console.warn(`No Organization is defined for Package Code: ${packageCode}`)
    }
  }
}
