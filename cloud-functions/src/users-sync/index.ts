/**
 * Background Cloud Function,
 * listens to firestore user collection create and update event,
 * syncs data to cloud SQL
 */
import * as functions from 'firebase-functions'
import {UserHandler} from './src/handlers'

const createUser = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snap, context) => {
    const firebaseKey = context.params.userId
    const newValue = snap.data()
    UserHandler.createUser(firebaseKey, newValue)
  })

const updateUser = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const firebaseKey = context.params.userId
    const newValue = change.after.data()
    const previousValue = change.before.data()
    UserHandler.updateUser(firebaseKey, newValue, previousValue)
  })

export {createUser, updateUser}
