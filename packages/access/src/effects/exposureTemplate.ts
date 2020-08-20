import {ExposureReport} from '../models/trace'
import {User} from '../../../common/src/data/user'
import type {Access} from '../models/access'

const formatName = (user: User): string =>
  `${user.firstName} ${user.lastNameInitial}.             `.substring(0, 35)

export const getExposureSection = (
  report: ExposureReport,
  accesses: Access[],
  users: User[],
  locationName: string,
  sourceUser: User,
): string => {
  if (!report.overlapping.length) {
    return ''
  }
  const overlapping = [...report.overlapping]
  overlapping.sort((a, b) => a.start.valueOf() - b.start.valueOf())
  return `
------------------------------POTENTIAL EXPOSURES------------------------------
${report.date}
Location: ${locationName}
Source of exposure: ${formatName(sourceUser)}
${overlapping
  .map((overlap) => {
    return `    ${formatName(
      users.find((user) => user.id === overlap.userId),
    )} ${overlap.start.toLocaleTimeString()} - ${overlap.end.toLocaleTimeString()}`
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
