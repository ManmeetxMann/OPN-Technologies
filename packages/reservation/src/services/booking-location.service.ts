import DataStore from '../../../common/src/data/datastore'

import {Certificate, BookingLocations} from '../models/packages'
import {PackageRepository} from '../respository/package.repository'
import {AcuityRepository} from '../respository/acuity.repository'
import {encodeBookingLocationId} from '../utils/base64-converter'
import {AppointmentTypes} from '../models/appointment-types'

export class BookingLocationService {
  private acuityRepository = new AcuityRepository()
  private packageRepository = new PackageRepository(new DataStore())
  private defaultCurrency = 'CAD'

  private getPublicAppointmentTypes(
    appointmentTypes: AppointmentTypes[],
  ): {certificate: string; appointmentType: AppointmentTypes}[] {
    const publicTypes = appointmentTypes.filter((type) => !type.private)

    return publicTypes.map((appointmentType) => ({
      appointmentType,
      certificate: '',
    }))
  }

  private async getAppointmentTypesWithPackages(
    organizationId: string,
    appointmentTypes: AppointmentTypes[],
  ): Promise<
    IterableIterator<{certificate: string; count?: number; appointmentType: AppointmentTypes}>
  > {
    const appointmentTypesWithPackages = new Map<
      string,
      {certificate: string; count?: number; appointmentType: AppointmentTypes}
    >()
    const packages = await this.getPackageListByOrganizationId(organizationId)

    packages.map(({certificate, remainingCounts}) => {
      Object.keys(remainingCounts).map((appointmentTypeId) => {
        const appointmentTypesWithPackage = appointmentTypesWithPackages.get(appointmentTypeId)

        if (
          (!appointmentTypesWithPackage && remainingCounts[appointmentTypeId]) ||
          (remainingCounts[appointmentTypeId] &&
            appointmentTypesWithPackage.count > remainingCounts[appointmentTypeId])
        ) {
          const appointmentType = appointmentTypes.find(({id}) => id === Number(appointmentTypeId))

          if (appointmentType) {
            appointmentTypesWithPackages.set(appointmentTypeId, {
              appointmentType,
              count: remainingCounts[appointmentTypeId],
              certificate,
            })
          }
        }
      })
    })

    return appointmentTypesWithPackages.values()
  }

  async getBookingLocations(
    organizationId: string,
    enablePaymentForBooking: boolean,
  ): Promise<BookingLocations[]> {
    const calendars = await this.acuityRepository.getCalendarList()
    const appointmentTypes = await this.acuityRepository.getAppointmentTypeList()

    const appointmentTypesWithPackages = enablePaymentForBooking
      ? this.getPublicAppointmentTypes(appointmentTypes)
      : await this.getAppointmentTypesWithPackages(organizationId, appointmentTypes)

    const bookingLocations = []
    Array.from(appointmentTypesWithPackages).map((appointmentTypesWithPackage) => {
      const {appointmentType, certificate} = appointmentTypesWithPackage
      appointmentType.calendarIDs.forEach((calendarId) => {
        const calendar = calendars.find(({id}) => id === calendarId)
        const idBuf = {
          appointmentTypeId: appointmentType.id,
          calendarTimezone: calendar.timezone,
          calendarName: calendar.name,
          calendarId: calendar.id,
          organizationId,
          packageCode: certificate,
        }

        const id = encodeBookingLocationId(idBuf)

        bookingLocations.push({
          id,
          appointmentTypeName: appointmentType.name,
          name: calendar.name,
          address: calendar.location,
          price: appointmentType.price,
          currency: this.defaultCurrency,
        })
      })
    })

    return bookingLocations
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
