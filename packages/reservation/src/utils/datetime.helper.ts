import {Config} from '../../../common/src/utils/config'
import {DeadlineLabel} from '../models/appointment'
import {firestore} from 'firebase-admin'

const timeZone = Config.get('DEFAULT_TIME_ZONE')
import moment from 'moment-timezone'

export const makeDeadline = (utcDateTime: moment.Moment, deadlineLabel?: DeadlineLabel): string => {
  let deadline
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
  return deadline.utc().format()
}

export const makeTimeEndOfTheDayMoment = (datetime: moment.Moment): moment.Moment => {
  return datetime.hours(23).minutes(59).seconds(0)
}

export const makeTimeEndOfTheDay = (datetime: moment.Moment): string => {
  return makeTimeEndOfTheDayMoment(datetime).format()
}

export const getDateFromDatetime = (transportDateTime: Date | string): string => {
  return moment(transportDateTime).tz(timeZone).format('YYYY-MM-DD')
}

export const makeFirestoreTimestamp = (date: Date | string): firestore.Timestamp => {
  return firestore.Timestamp.fromDate(
    makeTimeEndOfTheDayMoment(moment(date)).milliseconds(0).tz(timeZone).utc().toDate(),
  )
}
