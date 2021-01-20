import DataStore from '../../../common/src/data/datastore'
import {uniq} from 'lodash'

import {Certificate, BookingLocations} from '../models/packages'
import {PackageRepository} from '../respository/package.repository'
import {AcuityRepository} from '../respository/acuity.repository'

export class BookingLocationService {
  private acuityRepository = new AcuityRepository()
  private packageRepository = new PackageRepository(new DataStore())

  async getBookingLocations(organizationId: string): Promise<BookingLocations[]> {
    const packages = await this.getPackageListByOrganizationId(organizationId)
    const appointmentTypes = await this.acuityRepository.getAppointmentTypeList()
    const calendars = await this.acuityRepository.getCalendarList()
    const packagesAppointmentTypes = uniq(
      packages.map(({appointmentTypes}) => Object.keys(appointmentTypes)).flat(),
    )

    const bookingLocations = []

    packagesAppointmentTypes.map((appointmentTypeID) => {
      const appointmentType = appointmentTypes.find(({id}) => id === Number(appointmentTypeID))

      if (appointmentType) {
        appointmentType.calendarIDs.forEach((calendarId) => {
          const calendar = calendars.find(({id}) => id === calendarId)
          const idBuf = {
            appointmentTypeId: appointmentType.id,
            calendarTimezone: calendar.timezone,
            calendarId: calendar.id,
          }
          const id = Buffer.from(JSON.stringify(idBuf)).toString('base64')

          bookingLocations.push({
            id,
            appointmentTypeName: appointmentType.name,
            name: calendar.name,
            address: calendar.location,
          })
        })
      }
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