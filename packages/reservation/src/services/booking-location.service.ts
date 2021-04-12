import DataStore from '../../../common/src/data/datastore'

import {Certificate, BookingLocations} from '../models/packages'
import {PackageRepository} from '../respository/package.repository'
import {AcuityRepository} from '../respository/acuity.repository'
import {encodeBookingLocationId} from '../utils/base64-converter'
import {AppointmentTypes} from '../models/appointment-types'

export class BookingLocationService {
  private acuityRepository = new AcuityRepository()
  private packageRepository = new PackageRepository(new DataStore())

  private async getAppointmentTypesWithPackages(
    organizationId: string,
    enablePaymentForBooking: boolean,
  ): Promise<
    IterableIterator<{certificate: string; count?: number; appointmentType: AppointmentTypes}>
  > {
    const appointmentTypes = await this.acuityRepository.getAppointmentTypeList()
    const appointmentTypesWithPackages = new Map<
      string,
      {certificate: string; count?: number; appointmentType: AppointmentTypes}
    >()

    if (enablePaymentForBooking) {
      const publicTypes = appointmentTypes.filter((type) => !type.private)

      publicTypes.map((appointmentType) => {
        appointmentTypesWithPackages.set(String(appointmentType.id), {
          appointmentType,
          certificate: '',
        })
      })
    } else {
      const packages = await this.getPackageListByOrganizationId(organizationId)

      packages.map(({certificate, remainingCounts}) => {
        Object.keys(remainingCounts).map((appointmentTypeId) => {
          const appointmentTypesWithPackage = appointmentTypesWithPackages.get(appointmentTypeId)

          if (
            (!appointmentTypesWithPackage && remainingCounts[appointmentTypeId]) ||
            (remainingCounts[appointmentTypeId] &&
              appointmentTypesWithPackage.count > remainingCounts[appointmentTypeId])
          ) {
            const appointmentType = appointmentTypes.find(
              ({id}) => id === Number(appointmentTypeId),
            )

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
    }

    return appointmentTypesWithPackages.values()
  }

  async getBookingLocations(
    organizationId: string,
    enablePaymentForBooking: boolean,
  ): Promise<BookingLocations[]> {
    const calendars = await this.acuityRepository.getCalendarList()
    const appointmentTypesWithPackages = await this.getAppointmentTypesWithPackages(
      organizationId,
      enablePaymentForBooking,
    )

    const bookingLocations = []
    Array.from(appointmentTypesWithPackages).map((appointmentTypesWithPackage) => {
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
