import moment from 'moment-timezone'

import {ExposureReport} from '../models/trace'
import {User, UserDependant} from '../../../common/src/data/user'
import type {SinglePersonAccess} from '../models/attendance'
import {now} from '../../../common/src/utils/times'
import {Config} from '../../../common/src/utils/config'

const timeZone = Config.get('DEFAULT_TIME_ZONE')

const formatName = (user: User, dependant?: UserDependant): string => {
  if (!dependant) {
    return `${user.firstName} ${user.lastName}`
  } else {
    return `${dependant.firstName} ${dependant.lastName} (${user.firstName} ${user.lastName})`
  }
}
const formatTime = (date: Date) => {
  if (moment(date) >= moment(now())) {
    return '(not checked out)'
  }
  return moment(date).tz(timeZone).format('hh:mm a')
}

const padTo80 = (line: string): string =>
  `                                                                                ${line}`.slice(
    -80,
  )

export const getExposureSection = (
  report: ExposureReport,
  accesses: SinglePersonAccess[],
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
------------------------------POTENTIAL EXPOSURES------------------------------<br>
${report.date}<br>
Location: ${locationName}<br>
Source of exposure: ${formatName(sourceUser)}<br>
${overlapping
  .map((overlap) => {
    return `    ${formatName(
      users.find((user) => user.id === overlap.userId),
      overlap.dependant,
    )}<br>
${padTo80(`${formatTime(overlap.start)} - ${formatTime(overlap.end)}`)}<br>
`
  })
  .join('\n<br>')}<br>
  ${getAccessSection(accesses, users)}
  `
}

export const getAccessSection = (
  accesses: SinglePersonAccess[],
  users: User[],
  locationName?: string,
  date?: string,
): string => {
  const printableAccesses = accesses.map((acc) => ({
    name: formatName(
      users.find((user) => user.id === acc.userId),
      acc.dependant,
    ),
    // @ts-ignore these are timestamps, not dates
    start: (acc.enteredAt ?? moment(acc.exitAt.toDate()).tz(timeZone).startOf('day')).toDate(),
    // @ts-ignore these are timestamps, not dates
    end: (acc.exitAt ?? moment(acc.enteredAt.toDate()).tz(timeZone).endOf('day')).toDate(),
  }))
  printableAccesses.sort((a, b) => a.start.valueOf() - b.start.valueOf())
  return `${
    locationName && date
      ? `    ALL ACCESSES FOR ${locationName} on ${date}`
      : '----------------------------------ALL ACCESSES---------------------------------'
  }<br>
${printableAccesses
  .map((printable) => {
    return `    ${printable.name}<br>
${padTo80(`${formatTime(printable.start)} - ${formatTime(printable.end)}`)}
<br>`
  })
  .join('\n<br>')}<br>`
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
