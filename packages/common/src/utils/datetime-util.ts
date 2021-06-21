import {now} from './times'

import {firestore} from 'firebase-admin'
import {fixTimestamp} from './timesTamp-util'

// Must be required, otherwise brake when imported to v2
// eslint-disable-next-line @typescript-eslint/no-var-requires
const moment = require('moment-timezone')

export const isPassed = (date: Date | string): boolean => moment(date).isBefore(moment(now()))

export type GenericTimestamp = string | moment.Moment | Date | firestore.FieldValue | number

// Accept something which is any sort of timestamp, and return a Date
// handles strings with the "day of year" bug correctly
export const safeTimestamp = (timestamp: GenericTimestamp): Date => {
  if (moment.isMoment(timestamp)) {
    return moment(timestamp).toDate()
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
