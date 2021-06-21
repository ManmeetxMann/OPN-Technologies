/**
 * Crone Based Cloud Function,
 * Check firestore user and mysql patient collections synced or no
 */
import * as functions from 'firebase-functions'
import {UserHandler} from './src/handlers'
const timeZone = process.env.DEFAULT_TIME_ZONE

const checkUserSyncCoverage = functions.pubsub
  .schedule('0 11 * * *')
  .timeZone(timeZone)
  .onRun(() => {
    UserHandler.checkUserSyncCoverage()
    return null
  })

const checkPatientSyncCoverage = functions.pubsub
  .schedule('0 11 * * *')
  .timeZone(timeZone)
  .onRun(() => {
    UserHandler.checkPatientSyncCoverage()
    return null
  })

export {checkUserSyncCoverage, checkPatientSyncCoverage}
