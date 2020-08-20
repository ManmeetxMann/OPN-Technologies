import {ExposureReport} from '../models/trace'
import {User} from '../../../common/src/data/user'
import type {Access} from '../models/access'

const formatName = (user: User): string =>
  `${user.firstName} ${user.lastNameInitial}.                             `.substring(0, 46)

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
  const printableAccesses = accesses.map((access) => ({
    name: formatName(users.find((user) => user.id === access.userId)),
    // @ts-ignore these are timestamps, not dates
    start: access.enteredAt.toDate(),
    // @ts-ignore these are timestamps, not dates
    end: access.exitAt ? access.exitAt.toDate() : {toLocaleTimeString: () => 'END OF DAY'},
  }))
  printableAccesses.sort((a, b) => a.start.valueOf() - b.start.valueOf())
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
----------------------------------ALL ACCESSES---------------------------------
${printableAccesses
  .map((printable) => {
    return `    ${
      printable.name
    } ${printable.start.toLocaleTimeString()} - ${printable.end.toLocaleTimeString()}`
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
