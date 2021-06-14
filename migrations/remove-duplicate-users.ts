/**
 * Remove duplicated user in firestore by authUserId caused by testing and broken user sync
 * Add auth user ids to array DUPLICATE_USER_AUTH_USER_ID
 * Remove all profile with less than max fields count and all older by date. To keep only one.
 */

import {initializeApp, credential, firestore} from 'firebase-admin'
import {Config} from '../packages/common/src/utils/config'

import * as dotenv from 'dotenv'
const config = dotenv.config()

if (config.error) {
  console.error('No .env file')
  process.exit(1)
}

const DRY_RUN = true

const serviceAccount = JSON.parse(Config.get('FIREBASE_ADMINSDK_SA'))
initializeApp({
  credential: credential.cert(serviceAccount),
})
const database = firestore()

// Array from service-2 user migration script
const DUPLICATE_USER_AUTH_USER_ID = []

async function removeDuplicatedUser(authUserId) {
  const users = await database.collection('users').where('authUserId', '==', authUserId).get()

  if (users.empty) {
    console.error(`No user found ${authUserId} terminated`)
    process.exit(1)
  }

  const results = []
  users.docs.map((user) => {
    const id = user.id
    const data = user.data()
    const keysCount = Object.keys(data).length
    results.push({id, data, keysCount})
  })
  console.log(`\n\nUser profiles for auth userId ${authUserId} has ${results.length} document`)

  let minKeys = 1000
  let maxKeys = 0
  results.forEach((result) => {
    const keysCount = result.keysCount
    if (keysCount > maxKeys) {
      maxKeys = keysCount
    }
    if (keysCount < minKeys) {
      minKeys = keysCount
    }
  })

  // Remove all with less fields than max
  const documentWithSameFields = []
  for (const result of results) {
    if (result.keysCount < maxKeys) {
      if (!DRY_RUN) {
        console.log(`Removing user document: ${result.id}`)
        await database.collection('users').doc(result.id).delete()
      } else {
        console.log(`Going to remove user document: ${result.id}`)
      }
    } else {
      documentWithSameFields.push(result)
    }
  }

  documentWithSameFields.sort(function (a, b) {
    if (!a.data.timestamps) {
      return 1
    }
    if (!b.data.timestamps) {
      return -1
    }
    return (
      b.data.timestamps.createdAt.toDate().getTime() -
      a.data.timestamps.createdAt.toDate().getTime()
    )
  })

  console.log(
    `\n\nUser profiles for auth userId ${authUserId} has ${documentWithSameFields.length} document with same keys count`,
  )

  // Remove all beside recently created
  let index = 0
  for (const result of documentWithSameFields) {
    if (index != 0) {
      if (!DRY_RUN) {
        console.log(`Removing user document: ${result.id}`)
        await database.collection('users').doc(result.id).delete()
      } else {
        console.log(`Going to remove user document: ${result.id}`)
      }
    }
    index++
  }
}

async function main() {
  try {
    console.log(`Migrate Dependents for GCP projectId: ${serviceAccount.project_id}`)
    console.log(`Migration Starting with DRY_RUN: ${DRY_RUN}`)

    const uniqAuthUserId = [...new Set(DUPLICATE_USER_AUTH_USER_ID)]

    for (const authUser of uniqAuthUserId) {
      await removeDuplicatedUser(authUser)
    }
  } catch (error) {
    console.error('Error running migration', error)
  } finally {
  }
}

main().then(() => console.log('Script Complete \n'))
