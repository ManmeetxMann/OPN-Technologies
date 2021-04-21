import {Config} from '../../../common/src/utils/config'
import {DeadlineLabel} from '../models/appointment'
import {firestore} from 'firebase-admin'

const moment = require('moment-timezone')

const timeZone = Config.get('DEFAULT_TIME_ZONE')
const rapidDeadlineTime = Config.get('RAPID_ALERGEN_DEADLINE_MIN')

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

export const getDayFromDatetime = (transportDateTime: Date | string): string => {
  return moment(transportDateTime).tz(timeZone).format('DD')
}

export const getMonthFromDatetime = (transportDateTime: Date | string): string => {
  return moment(transportDateTime).tz(timeZone).format('MMM')
}

export const getDateDefaultHumanReadable = (dateTime: Date | string): string =>
  moment(dateTime).tz(timeZone).format('MMMM Do, YYYY h:mmA ')

export const getDateFromDatetime = (transportDateTime: Date | string): string => {
  return moment(transportDateTime).tz(timeZone).format('YYYY-MM-DD')
}

export const getTimeFromFirestoreDateTime = (dateTime: firestore.Timestamp): string => {
  return moment(dateTime.toDate()).utc().format('HH:mm:ss')
}

export const makeUtcIsoDate = (date: string, time: string): string => {
  return moment(`${date}T${time}`).utc().toISOString()
}

export const makeDefaultIsoDate = (date: string, time: string): string => {
  return moment(`${date}T${time}`).tz(timeZone).toISOString()
}

export const makeRegularIsoDate = (date: string): string => {
  return new Date(date).toISOString()
}

export const makeDeadlineForFilter = (date: Date | string): firestore.Timestamp => {
  const utcEndOfDay = makeTimeEndOfTheDayMoment(moment.tz(date, timeZone)).toDate()
  return firestore.Timestamp.fromDate(utcEndOfDay)
}

export const makeFirestoreTimestamp = (localDate: Date | string): firestore.Timestamp => {
  return firestore.Timestamp.fromDate(moment.tz(localDate, timeZone).toDate())
}

export const formatDateRFC822Local = (timestamp: firestore.Timestamp): string => {
  return moment(timestamp.toDate()).tz(timeZone).toISOString()
}

export const makeRapidDeadline = (): moment.Moment => {
  return moment(new Date()).add(rapidDeadlineTime, 'minutes').tz(timeZone)
}

export const formatStringDateRFC822Local = (date: Date | string): string => {
  return moment(date).tz(timeZone).toISOString()
}

export const firestoreTimeStampToUTC = (timestamp: firestore.Timestamp): moment.Moment => {
  return moment(timestamp.toDate()).utc()
}

export const getFirestoreTimeStampDate = (datetime: firestore.Timestamp): firestore.Timestamp =>
  firestore.Timestamp.fromDate(
    moment(datetime.toDate())
      .tz(timeZone)
      .set({
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0,
      })
      .utc(true)
      .toDate(),
  )

export const dateToDateTime = (date: string): firestore.Timestamp => {
  const year = Number(date.split('-')[0])
  const month = Number(date.split('-')[1]) - 1
  const day = Number(date.split('-')[2])
  return firestore.Timestamp.fromDate(
    moment()
      .utc(true)
      .set({
        year,
        month,
        date: day,
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0,
      })
      .toDate(),
  )
}

export const isSameOrBefore = (date: string): boolean =>
  moment(moment().tz(timeZone).format('YYYY-MM-DD')).isSameOrBefore(
    formatStringDateRFC822Local(date),
  )
