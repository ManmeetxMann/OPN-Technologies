import DataStore from '../../../common/src/data/datastore'

import {Certificate, BookingLocations} from '../models/packages'
import {PackageRepository} from '../respository/package.repository'
import {AcuityRepository} from '../respository/acuity.repository'
import {encodeBookingLocationId} from '../utils/base64-converter'
import {AppointmentTypes} from '../models/appointment-types'

export class BookingLocationService {
  private acuityRepository = new AcuityRepository()
  private packageRepository = new PackageRepository(new DataStore())

  async getBookingLocations(
    organizationId: string,
    enablePaymentForBooking: boolean,
  ): Promise<BookingLocations[]> {
    const packages = await this.getPackageListByOrganizationId(
      organizationId,
      enablePaymentForBooking,
    )
    const appointmentTypes = await this.acuityRepository.getAppointmentTypeList()
    const calendars = await this.acuityRepository.getCalendarList()
    const appointmentTypesWithPackages = new Map<
      string,
      {certificate: string; count: number; appointmentType: AppointmentTypes}
    >()

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

    const bookingLocations = []
    Array.from(appointmentTypesWithPackages.values()).map((appointmentTypesWithPackage) => {
      const {appointmentType, certificate} = appointmentTypesWithPackage
      appointmentType.calendarIDs.forEach((calendarId) => {
        const calendar = calendars.find(({id}) => id === calendarId)
        const idBuf = {
          appointmentTypeId: appointmentType.id,
          calendarTimezone: calendar.timezone,
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
        })
      })
    })

    return bookingLocations
  }

  async getPackageListByOrganizationId(
    organizationId: string,
    enablePaymentForBooking: boolean,
  ): Promise<Certificate[]> {
    const packagesAcuity = await this.acuityRepository.getPackagesList()

    const packageCodeWithRemaining = packagesAcuity.filter((packageCode) => {
      return packageCode.remainingCounts && Object.keys(packageCode.remainingCounts).length
    })

    if (enablePaymentForBooking) {
      return packageCodeWithRemaining
    }

    const packages = await this.packageRepository.findWhereEqual('organizationId', organizationId)
    const packageCodeIds = packages.map(({packageCode}) => packageCode)

    return packageCodeWithRemaining.filter(({certificate}) => packageCodeIds.includes(certificate))
  }
}
