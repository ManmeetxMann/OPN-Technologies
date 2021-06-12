import {firestore} from 'firebase-admin'
import {Config} from './config'
import {GenericTimestamp, safeTimestamp} from './datetime-util'
import moment from 'moment-timezone'

const timeZone = Config.get('DEFAULT_TIME_ZONE')

// utility wrapper for time-related values
// used for testing to change the server timestamp

const manualModeEnabled = Config.get('FEATURE_DEBUG_MANUAL_TIMESTAMPS') === 'enabled'
const currentTimeMillis = 0

export const getFirestoreTimestamp = (validFromDate: Date): firestore.FieldValue =>
  firestore.Timestamp.fromDate(validFromDate)

export const serverTimestamp = (): firestore.FieldValue => {
  if (manualModeEnabled && currentTimeMillis) {
    return new firestore.Timestamp(Math.floor(currentTimeMillis / 1000), currentTimeMillis % 1000)
  }
  return firestore.FieldValue.serverTimestamp()
}

export const now = (): Date => {
  if (manualModeEnabled && currentTimeMillis) {
    return new Date(currentTimeMillis)
  }
  return new Date()
}

export enum dateFormats {
  longMonth = 'MMMM DD, YYYY',
}

export enum timeFormats {
  standard12h = 'h:mma',
}
export const toDateFormat = (timestamp: GenericTimestamp): string => {
  const date = safeTimestamp(timestamp)
  return moment(date).tz(timeZone).format('MMMM D, YYYY')
}

export const toDateTimeFormat = (timestamp: GenericTimestamp): string => {
  const date = safeTimestamp(timestamp)
  return moment(date).tz(timeZone).format('h:mm A MMMM D, YYYY')
}

export const toDateFormatWithoutTimezone = (timestamp: GenericTimestamp): string => {
  const date = safeTimestamp(timestamp)
  return moment(date).utc().format('YYYY-MM-DD')
}

export const toDateTimeFormatWithoutTimezone = (timestamp: GenericTimestamp): Date => {
  const date = safeTimestamp(timestamp)
  return moment(date).utc().toDate()
}

export const isValidDate = (date: string): boolean => !isNaN(Date.parse(date))
