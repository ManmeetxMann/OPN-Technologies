import {Config} from '../../../common/src/utils/config'

const timeZone = Config.get('DEFAULT_TIME_ZONE')

export const makeDeadline = (utcDateTime: moment.Moment, nextDay = false): string => {
  let deadline
  const tzDateTime = utcDateTime.clone().tz(timeZone)
  if (tzDateTime.hours() > 12 || nextDay) {
    deadline = makeTimeEndOfTheDayMoment(tzDateTime.add(1, 'd'))
  } else {
    deadline = makeTimeEndOfTheDayMoment(tzDateTime)
  }
  return deadline.utc().format()
}


export const makeTimeEndOfTheDayMoment = (datetime: moment.Moment): moment.Moment => {
  return datetime.hours(11).minutes(59).seconds(0)
}

export const makeTimeEndOfTheDay = (datetime: moment.Moment): string => {
  return makeTimeEndOfTheDayMoment(datetime).format()
}