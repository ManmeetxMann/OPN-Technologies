import DataStore from '../../../common/src/data/datastore'

import {PackageBase} from '../models/packages'
import {PackageRepository} from '../respository/package.repository'

export class PackageService {
  private packageRepository = new PackageRepository(new DataStore())

  async getAllByOrganizationId(
    organizationId: string,
    page: number,
    perPage: number,
  ): Promise<PackageBase[]> {
    const query = this.packageRepository
      .getQueryFindWhereEqual('organizationId', organizationId)
      .orderBy('packageCode')

    return this.packageRepository.fetchPage(query, page, perPage)
  }

  async savePackage(packageCode: string, organizationId: string = null): Promise<void> {
    if (!packageCode) {
      return console.warn(`No packageCode`)
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
