import DataStore from '../../../common/src/data/datastore'

import {PackageBase, PackageListItem} from '../models/packages'
import {PackageRepository} from '../respository/package.repository'
import {AcuityRepository} from '../respository/acuity.repository'
import {OrganizationService} from '../../../enterprise/src/services/organization-service'
import {ForbiddenException} from '../../../common/src/exceptions/forbidden-exception'
import {AppointmentToTestTypeAssocService} from './appointment-to-test-type-association.service'
import {TestTypes} from '../models/appointment'

export class PackageService {
  private acuityRepository = new AcuityRepository()
  private packageRepository = new PackageRepository(new DataStore())
  private organizationService = new OrganizationService()
  private appointmentToTestTypeService = new AppointmentToTestTypeAssocService()

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

  async savePackage(packageCode: string, organizationId: string = null): Promise<PackageBase> {
    const result = await this.packageRepository.add({
      packageCode: packageCode,
      organizationId,
    })

    return result
  }

  async isExist(packageCode: string): Promise<boolean> {
    const result = await this.packageRepository.findWhereEqual('packageCode', packageCode)
    return !!result.length
  }

  async getPackageListByOrgId(
    packageCode: string,
    organizationId: string,
  ): Promise<{count: number; testType: string}[]> {
    const packagesAcuity = await this.acuityRepository.getPackagesList()
    const packageCodes: string[] = packagesAcuity.map(({certificate}) => certificate)
    const packages = await this.packageRepository.findWhereIn('packageCode', packageCodes)

    const currentPackage = packages.find((packageBase) => packageBase.packageCode === packageCode)

    if (currentPackage?.organizationId !== organizationId) {
      throw new ForbiddenException('Current package is not associated with your organizationId')
    }

    const currentPackageAcuity = packagesAcuity.find(
      (packageAcuity) => packageAcuity.certificate === currentPackage.packageCode,
    )

    const acuityTypeToTestType = await this.appointmentToTestTypeService.getAllByTypes(
      currentPackageAcuity.appointmentTypeIDs,
    )

    const countsByType: Record<string, number> = {}

    Object.entries(currentPackageAcuity.remainingCounts).forEach(([acuityType, count]) => {
      const currentTestType = acuityTypeToTestType.find(
        (testType) => testType.appointmentType === Number(acuityType),
      )

      const testType =
        currentTestType && currentTestType.testType ? currentTestType.testType : TestTypes.PCR

      if (countsByType[testType]) {
        countsByType[testType] += count
      } else {
        countsByType[testType] = count
      }
    })
    return Object.entries(countsByType).map(([testType, count]) => ({
      testType,
      count,
    }))
  }

  async getPackageList(all: boolean): Promise<PackageListItem[]> {
    const packagesAcuity = await this.acuityRepository.getPackagesList()
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
