import DataStore from '../../../common/src/data/datastore'

import {PackageBase} from '../models/packages'
import {PackageRepository} from '../respository/package.repository'
import {TestResultsDBRepository} from '../respository/test-results-db.repository'

export class PackageService {
  private packageRepository = new PackageRepository(new DataStore())
  private testResultsDBRepository = new TestResultsDBRepository(new DataStore())

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

  async savePackage(packageCode: string, organizationId: string = null): Promise<number> {
    await this.packageRepository.add({
      packageCode: packageCode,
      organizationId,
    })

    await this.testResultsDBRepository.updateAllFromCollectionWhereEqual(
      'packageCode',
      packageCode,
      {organizationId},
    )

    const updated = await this.testResultsDBRepository.findWhereEqual('packageCode', packageCode)

    // do not pay attention to this moment, I will correct it later
    return updated.length
  }

  async isExist(packageCode: string): Promise<boolean> {
    const result = await this.packageRepository.findWhereEqual('packageCode', packageCode)
    return !!result.length
  }
}
