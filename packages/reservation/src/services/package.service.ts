import DataStore from '../../../common/src/data/datastore'

import {PackageBase} from '../models/packages'
import {PackageRepository} from '../respository/package.repository'
import {TestResultsDBRepository} from '../respository/test-results-db.repository'
import {AppoinmentsSchedulerRepository} from '../respository/appointment-scheduler.repository'
import {TestResultsDBModel} from '../models/test-result'

export class PackageService {
  private appoinmentSchedulerRepository = new AppoinmentsSchedulerRepository()
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

  async getPackageList(all: boolean): Promise<unknown> {
    const packagesAcuity = await this.appoinmentSchedulerRepository.getManyAppointments({})

    let pachagesDb

    if (all) {
      const packageCodes: string[] = packagesAcuity.map(({packageCode}) => packageCode)
      pachagesDb = await this.testResultsDBRepository.findWhereIn('packageCode', packageCodes)
    }
    const result = new Map()

    packagesAcuity.map((packageCode) => {
      const pachageDb = pachagesDb?.find(
        (item: TestResultsDBModel) => item.packageCode === packageCode.packageCode,
      )

      const packageMap = result.get(packageCode.packageCode)

      if (!packageMap) {
        return result.set(packageCode.packageCode, {
          packageCode: packageCode.packageCode,
          name: `${packageCode.firstName} ${packageCode.firstName}`,
          remainingCounts: 1,
          organizationId: pachageDb?.organizationId,
        })
      }

      result.set(packageCode.packageCode, {
        packageCode: packageMap.packageCode,
        name: packageMap.name,
        remainingCounts: ++packageMap.remainingCounts,
        organizationId: packageMap.organizationId,
      })
    })

    return Array.from(result.values())
  }
}
