import moment from 'moment-timezone'

import {ExposureReport} from '../models/trace'
import {User, UserDependant} from '../../../common/src/data/user'
import type {SinglePersonAccess} from '../models/attendance'
import {now} from '../../../common/src/utils/times'
import {Config} from '../../../common/src/utils/config'

import {Questionnaire} from '../../../lookup/src/models/questionnaire'
type Answer = Record<string, boolean | string>
export type Answers = Record<string, Answer>
const timeZone = Config.get('DEFAULT_TIME_ZONE')

// printable info about a user's group membership and the memberships of their dependants
export type UserGroupData = {
  id: string
  orgId: string
  groupNames: string[]
  dependants: {
    id: string
    groupName: string
  }[]
}
const formatName = (user: User, dependant: UserDependant, groupData: UserGroupData): string => {
  if (!dependant) {
    return `${user.firstName} ${user.lastName} (${groupData.groupNames.join(', ')})`
  } else {
    return `${dependant.firstName} ${dependant.lastName} (${
      groupData.dependants.find((dep) => dep.id === dependant.id)?.groupName
    }, dependant of ${user.firstName} ${user.lastName})`
  }
}
const formatTime = (date: Date) => {
  if (moment(date) >= moment(now())) {
    return '(not checked out)'
  }
  return moment(date).tz(timeZone).format('hh:mm a')
}
const printableAnswers = (answer: Answer): string => {
  const keys = Object.keys(answer)
  keys.sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
  return keys
    .map((a) =>
      typeof answer[a] === 'boolean'
        ? answer[a]
          ? 'Yes'
          : 'No'
        : moment(answer[a] as string)
            .tz(timeZone)
            .format('LLLL'),
    )
    .join(', ')
}
const getResponseSection = (questionnaire: Questionnaire, answers: Answers): string => {
  const questionsKeys = Object.keys(questionnaire.questions)
  questionsKeys.sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
  return `<ul>${questionsKeys
    .map(
      (key) => `<li>${questionnaire.questions[key].value}:<br>
      ${printableAnswers(answers[key])}</li>`,
    )
    .join('\n')}</ul>`
}

// Add org name, responses
export const getHeaderSection = (
  user: User,
  exposureTime: number,
  status: string,
  questionnaire: Questionnaire,
  answers: Answers,
  userLookup: Record<string, UserGroupData>,
): string => {
  return `Hello there,<br>
<br>
There is a potential exposure. Please see below for details.<br>
<br>
<b><u>SOURCE OF EXPOSURE</u></b><br>
<br>
<b>Exposed user:</b> ${formatName(user, null, userLookup[user.id])}<br>
<b>Exposed status:</b> ${status}<br>
<b>Time of notification:</b> ${formatTime(new Date(exposureTime))}<br>
<br>
User responses:
${getResponseSection(questionnaire, answers)}
<b><u>POSSIBLE EXPOSURE SPREAD</u></b><br>
<br>
`
}

export const getExposureSection = (
  report: ExposureReport,
  users: User[],
  locationName: string,
  userLookup: Record<string, UserGroupData>,
): string => {
  if (!report.overlapping.length) {
    return ''
  }
  const overlapping = [...report.overlapping]
  overlapping.sort((a, b) => a.start.valueOf() - b.start.valueOf())
  return `<b>Location:</b> ${locationName} on ${report.date}<br>
<ul>
${overlapping
  .map((overlap) => {
    return `<li>${formatName(
      users.find((user) => user.id === overlap.userId),
      overlap.dependant,
      userLookup[overlap.userId],
    )} <br>
    \u25e6 Overlap of check in: ${`${formatTime(overlap.start)} - ${formatTime(overlap.end)}`}<br>
</li>

`
  })
  .join('\n<br>')}<br>
  `
}

export const getAccessSection = (
  accesses: SinglePersonAccess[],
  users: User[],
  locationName: string | null,
  date: string | null,
  userLookup: Record<string, UserGroupData>,
): string => {
  const printableAccesses = accesses.map((acc) => ({
    name: formatName(
      users.find((user) => user.id === acc.userId),
      acc.dependant,
      userLookup[acc.userId],
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
${`${formatTime(printable.start)} - ${formatTime(printable.end)}`}
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
