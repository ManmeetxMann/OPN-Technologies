import {ExposureReport} from '../models/trace'
import {User} from '../../../common/src/data/user'

const formatName = (user: User): string => `${user.firstName} ${user.lastNameInitial}.`

export const getExposureSection = (report: ExposureReport, users: User[]): string => {
  if (!report.overlapping.length) {
    return ''
  }
  return `
------------------------------POTENTIAL EXPOSURES------------------------------
${report.date}
    Organization: ${report.organizationId}
    Location: ${report.locationId}
${report.overlapping
  .map((overlap) => {
    return `        ${formatName(
      users.find((user) => user.id === overlap.userId),
    )}: ${overlap.start.toLocaleTimeString()} - ${overlap.end.toLocaleTimeString()}`
  })
  .join('\n')}
  `
}

// type EmailMeta = {
//   email: string
//   locReports: ExposureReport[]
//   orgReports: ExposureReport[]
// }

// export const generateEmailForUser = (info: EmailMeta): string => {
//   const reports = [...info.locReports, ...info.orgReports]
//   return reports.map(getExposureSection).join('\n\n\n')
// }
