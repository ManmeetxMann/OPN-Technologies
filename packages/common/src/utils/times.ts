import {firestore} from 'firebase-admin'
import {Config} from './config'
import {Request, Response} from 'express'
import {GenericTimestamp, safeTimestamp} from './datetime-util'
import moment from 'moment-timezone'

const timeZone = Config.get('DEFAULT_TIME_ZONE')

// utility wrapper for time-related values
// used for testing to change the server timestamp

const manualModeEnabled = Config.get('FEATURE_DEBUG_MANUAL_TIMESTAMPS') === 'enabled'
let currentTimeMillis = 0

export const serverTimestamp = (): firestore.FieldValue => {
  if (manualModeEnabled && currentTimeMillis) {
    return new firestore.Timestamp(Math.floor(currentTimeMillis / 1000), currentTimeMillis % 1000)
  }
  return firestore.FieldValue.serverTimestamp()
}

export const setTime: (req: Request, res: Response) => void = (
  req: Request,
  res: Response,
): void => {
  if (!manualModeEnabled) {
    res.status(403).send('not in the correct mode for this')
    return
  }
  currentTimeMillis = req.body.milliseconds
  res.status(200).send('OK')
}

export const now = (): Date => {
  if (manualModeEnabled && currentTimeMillis) {
    return new Date(currentTimeMillis)
  }
  return new Date()
}

export const toDateFormat = (timestamp: GenericTimestamp): string => {
  const date = safeTimestamp(timestamp)
  return moment(date).tz(timeZone).format('MMMM D, YYYY')
}

export const toDateTimeFormat = (timestamp: GenericTimestamp): string => {
  const date = safeTimestamp(timestamp)
  return moment(date).tz(timeZone).format('h:mm A MMMM D, YYYY')
}

export const isValidDate = (date: string): boolean => !isNaN(Date.parse(date))
