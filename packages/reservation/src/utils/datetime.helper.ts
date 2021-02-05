import {Config} from '../../../common/src/utils/config'
import {DeadlineLabel} from '../models/appointment'
import {firestore} from 'firebase-admin'

const timeZone = Config.get('DEFAULT_TIME_ZONE')
import moment from 'moment-timezone'

export const makeDeadline = (
  utcDateTime: moment.Moment,
  deadlineLabel?: DeadlineLabel,
): firestore.Timestamp => {
  let deadline: moment.Moment
  const tzDateTime = utcDateTime.clone().tz(timeZone)
  if (deadlineLabel === DeadlineLabel.NextDay) {
    deadline = makeTimeEndOfTheDayMoment(tzDateTime.add(1, 'd'))
  } else if (deadlineLabel === DeadlineLabel.SameDay) {
    deadline = makeTimeEndOfTheDayMoment(tzDateTime)
  } else if (tzDateTime.hours() > 12) {
    deadline = makeTimeEndOfTheDayMoment(tzDateTime.add(1, 'd'))
  } else {
    deadline = makeTimeEndOfTheDayMoment(tzDateTime)
  }
  return firestore.Timestamp.fromDate(deadline.utc().milliseconds(0).toDate())
}

const makeTimeEndOfTheDayMoment = (datetime: moment.Moment): moment.Moment => {
  return datetime.hours(23).minutes(59).seconds(0)
}

export const getDateFromDatetime = (transportDateTime: Date | string): string => {
  return moment(transportDateTime).tz(timeZone).format('YYYY-MM-DD')
}

export const makeDeadlineForFilter = (date: Date | string): firestore.Timestamp => {
  const utcEndOfDay = makeTimeEndOfTheDayMoment(moment.tz(date, timeZone)).toDate()
  return firestore.Timestamp.fromDate(utcEndOfDay)
}

export const makeFirestoreTimestamp = (localDate: Date | string): firestore.Timestamp => {
  return firestore.Timestamp.fromDate(moment.tz(localDate, timeZone).toDate())
}

export const formatDateRFC822Local = (timestamp: firestore.Timestamp): string => {
  return moment(timestamp.toDate()).tz(timeZone).format()
}
