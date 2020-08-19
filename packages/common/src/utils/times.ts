import {firestore} from 'firebase-admin'
import {Config} from './config'

const manualModeEnabled = Config.get('FEATURE_DEBUG_MANUAL_TIMESTAMPS') === 'enabled'
let currentTimeMillis = 0

export const serverTimestamp = (): firestore.FieldValue => {
  if (manualModeEnabled && currentTimeMillis) {
    return new firestore.Timestamp(Math.floor(currentTimeMillis / 1000), currentTimeMillis % 1000)
  }
  return firestore.FieldValue.serverTimestamp()
}
export const setTime = (millis: number): void => {
  if (!manualModeEnabled) {
    throw new Error('not in the correct mode for this')
  }
  currentTimeMillis = millis
}

export const now = (): Date => {
  if (manualModeEnabled && currentTimeMillis) {
    return new Date(currentTimeMillis)
  }
  return new Date()
}
