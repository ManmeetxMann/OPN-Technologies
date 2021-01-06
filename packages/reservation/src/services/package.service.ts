import DataStore from '../../../common/src/data/datastore'

import {PackageBase, PackageListItem} from '../models/packages'
import {PackageRepository} from '../respository/package.repository'
import {TestResultsDBRepository} from '../respository/test-results-db.repository'
import {AppoinmentsSchedulerRepository} from '../respository/appointment-scheduler.repository'
import {OrganizationService} from '../../../enterprise/src/services/organization-service'

export class PackageService {
  private appoinmentSchedulerRepository = new AppoinmentsSchedulerRepository()
  private packageRepository = new PackageRepository(new DataStore())
  private testResultsDBRepository = new TestResultsDBRepository(new DataStore())
  private organizationService = new OrganizationService()

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

  async getByPackageCode(packageCode: string): Promise<PackageBase> {
    const result = await this.packageRepository.findWhereEqual('packageCode', packageCode)
    if (result.length > 1) {
      console.log(`More than 1 result for the packageCode ${packageCode}`)
    }

    return result[0]
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

  async getPackageList(all: boolean): Promise<PackageListItem[]> {
    const packagesAcuity = await this.appoinmentSchedulerRepository.getPackagesList()
    const packagesOrganization = new Map()

    if (!all) {
      const packageCodes: string[] = packagesAcuity.map(({certificate}) => certificate)
      const packages = await this.packageRepository.findWhereIn('packageCode', packageCodes)
      const organizationIds = packages.map(({organizationId}) => organizationId)
      const organizations = await this.organizationService.getAllByIds(organizationIds)

      organizations.map(({id, name}) => {
        const packageEntity = packages.find(({organizationId}) => organizationId === id)
        packagesOrganization.set(packageEntity.packageCode, {organizationName: name})
      })
    }

    return packagesAcuity.map(
      (packageCode): PackageListItem => {
        const organization = packagesOrganization.get(packageCode.certificate)
        const remainingCountValues = Object.values(packageCode.remainingCounts || {})
        let remainingCounts

        if (remainingCountValues.length) {
          remainingCounts = remainingCountValues.reduce(
            (accumulator, current) => accumulator + current,
          )
        }

        return {
          packageCode: packageCode.certificate,
          name: packageCode.name,
          remainingCounts: remainingCounts || 0,
          organization: organization?.organizationName || '',
        }
      },
    )
  }
}
