import DataStore from '../../../common/src/data/datastore'

import {Certificate, PackageBase, PackageListItem, BookingLocations} from '../models/packages'
import {PackageRepository} from '../respository/package.repository'
import {AcuityRepository} from '../respository/acuity.repository'
import {OrganizationService} from '../../../enterprise/src/services/organization-service'

export class PackageService {
  private acuityRepository = new AcuityRepository()
  private packageRepository = new PackageRepository(new DataStore())
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

  async savePackage(packageCode: string, organizationId: string = null): Promise<void> {
    await this.packageRepository.add({
      packageCode: packageCode,
      organizationId,
    })
  }

  async isExist(packageCode: string): Promise<boolean> {
    const result = await this.packageRepository.findWhereEqual('packageCode', packageCode)
    return !!result.length
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

  async getBookingLocations(organizationId: string): Promise<BookingLocations[]> {
    const packages = await this.getPackageListByOrganizationId(organizationId)
    const appointmentTypes = await this.acuityRepository.getAppointmentTypeList()
    const calendars = await this.acuityRepository.getCalendarList()
    const packagesAppointmentTypes = packages
      .map(({appointmentTypes}) => Object.keys(appointmentTypes))
      .flat()

    const bookingLocation = packagesAppointmentTypes.map((appointmentTypeID) => {
      const appointmentType = appointmentTypes.find(({id}) => id === Number(appointmentTypeID))

      return appointmentType.calendarIDs.map((calendarId) => {
        const calendar = calendars.find(({id}) => id === calendarId)
        const idBuf = {
          appointmentTypeId: appointmentType.id,
          calendarTimezone: calendar.timezone,
          calendarId: calendar.id,
        }
        const id = Buffer.from(JSON.stringify(idBuf)).toString('base64')

        return {
          id,
          appointmentTypeName: appointmentType.name,
          name: calendar.name,
          address: calendar.location,
        }
      })
    })

    return bookingLocation.flat()
  }

  async getPackageListByOrganizationId(organizationId: string): Promise<Certificate[]> {
    const packagesAcuity = await this.acuityRepository.getPackagesList()

    const packageCodeWithRemaining = packagesAcuity.filter((packageCode) => {
      return packageCode.remainingCounts && Object.keys(packageCode.remainingCounts).length
    })

    const packages = await this.packageRepository.findWhereEqual('organizationId', organizationId)
    const packageCodeIds = packages.map(({packageCode}) => packageCode)

    return packageCodeWithRemaining.filter(({certificate}) => packageCodeIds.includes(certificate))
  }
}
