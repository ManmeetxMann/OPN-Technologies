import {now} from './times'

import moment from 'moment-timezone'
import {firestore} from 'firebase-admin'
import {Config} from './config'

const timeZone = Config.get('DEFAULT_TIME_ZONE')

// some timestamps are invalid and the "day" part is actually
// the day of the year. This function accepts a (valid or invalid)
// timestamp and returns a valid timestamp
export const fixTimestamp = (raw: string): string => {
  if (!isNaN(new Date(raw).valueOf())) {
    // raw is parseable on its own, no need to correct
    return raw
  }
  console.warn(`Saw invalid date ${raw}`)
  const [datePart, timePart] = raw.split('T')
  const [year, month, dayOfYear] = datePart.split('-')
  const date = moment().year(parseInt(year)).dayOfYear(parseInt(dayOfYear))
  return `${year}-${month}-${date.format('DD')}T${timePart}`
}

export const isPassed = (date: Date | string): boolean => moment(date).isBefore(moment(now()))

export type GenericTimestamp = string | moment.Moment | Date | firestore.FieldValue | number

// Accept something which is any sort of timestamp, and return a Date
// handles strings with the "day of year" bug correctly
export const safeTimestamp = (timestamp: GenericTimestamp): Date => {
  if (moment.isMoment(timestamp)) {
    return timestamp.toDate()
  }
  if (typeof timestamp === 'number') {
    return new Date(timestamp)
  }
  if (typeof timestamp === 'string') {
    return new Date(fixTimestamp(timestamp))
  }
  if (timestamp instanceof Date) {
    return timestamp
  }
  if (timestamp instanceof firestore.Timestamp) {
    return timestamp.toDate()
  }
  throw `${timestamp} cannot be interpreted as a date`
}

export const getDateFromDatetime = (transportDateTime: Date | string): string => {
  return moment(transportDateTime).tz(timeZone).format('YYYY-MM-DD')
}
