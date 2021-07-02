import {firestore} from 'firebase-admin'
import * as moment from 'moment'

export const toFormattedIso = (time: string): string => new Date(time).toISOString()
export const timestampToFormattedIso = (time: firestore.Timestamp): string =>
  time.toDate().toISOString()
export const toEmailFormattedDateTime = (time: Date): string =>
  moment(time).format('MMMM Do @ h:mma')
export const toEmailFormattedDateTimeWeekday = (time: Date): string =>
  moment(time).format('dddd, MMM DD, YYYY at h:mma')
