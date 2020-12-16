/**
 * Trim FirstName, LastName in UserCollection
 * Copy lastNameInitial to LastName if LastName empty
 */
import {initializeApp, credential, firestore} from 'firebase-admin'
import {Config} from '../packages/common/src/utils/config'

const serviceAccount = JSON.parse(Config.get('FIREBASE_ADMINSDK_SA'))
initializeApp({
  credential: credential.cert(serviceAccount),
})
console.log(`Trim FirstName LastName: ${serviceAccount.project_id}`)

const database = firestore()

export enum ResultStatus {
  Fulfilled = 'fulfilled',
  Rejected = 'rejected',
}

type Result = {
  status: ResultStatus
  value: unknown
}

export async function promiseAllSettled(promises: Promise<unknown>[]): Promise<Result[]> {
  return Promise.all(
    promises.map((promise) =>
      promise
        .then((value) => ({
          status: ResultStatus.Fulfilled,
          value,
        }))
        .catch((error: unknown) => ({
          status: ResultStatus.Rejected,
          value: error,
        })),
    ),
  )
}

async function updateAllUsers(): Promise<Result[]> {
  let offset = 0
  let hasMore = true

  const results: Result[] = []

  while (hasMore) {
    const usersSnapshot = await database.collection('users').offset(offset).limit(limit).get()

    offset += usersSnapshot.docs.length
    hasMore = !usersSnapshot.empty

    for (const user of usersSnapshot.docs) {
      const promises = []
      promises.push(trimFirstNameLastNameAndFixLastName(user))
      const result = await promiseAllSettled(promises)
      results.push(...result)
    }
  }
  return results
}

async function trimFirstNameLastNameAndFixLastName(
  snapshot: firestore.QueryDocumentSnapshot<firestore.DocumentData>,
) {
  const userId = snapshot.id
  const user = snapshot.data()
  const hasFirstName = user.hasOwnProperty('firstName')
  const hasLastName = user.hasOwnProperty('lastName')
  const hasLastNameInitial = user.hasOwnProperty('lastNameInitial')
  if (!hasFirstName) {
    console.warn(`${userId} missing firstName`)
    return Promise.resolve()
  }

  if (!hasLastName && !hasLastNameInitial) {
    console.warn(`${userId} missing lastName and lastNameInitial`)
    return Promise.resolve()
  }

  const trimedFirstName = user.firstName.trim()
  let trimedLastName = ""
  if (hasLastName) {
    trimedLastName = user.lastName.trim()
  }else{
    copiedLastNameInitial += 1
    console.warn(`${userId} copied lastNameInitial to lastName`)
    trimedLastName = user.lastNameInitial.trim()
  }
  
  if (user.firstName == trimedFirstName && user.lastName == trimedLastName) {
    //console.warn(`${userId} has no spaces for firstName and lastName`)
    return Promise.resolve()
  }

  try {
    console.info(`Updating: ${userId}`)
    return await snapshot.ref.set(
      {
        firstName: trimedFirstName,
        lastName: trimedLastName,
        timestamps: {
          migrations: {
            trimFirstNameLastNameAndFixLastName: firestore.FieldValue.serverTimestamp(),
          },
        },
      },
      {
        merge: true,
      },
    )
  } catch (error) {
    console.warn(`Failed: ${userId}`)
    throw error
  }
}

async function main() {
  try {
    console.log('Migration Starting')
    const results = await updateAllUsers()
    results.forEach((result) => {
      totalCount += 1
      if (result.status === ResultStatus.Fulfilled) {
        // @ts-ignore - We will always have a value if the status is fulfilled
        if (result.value) {
          successCount += 1
        }
      } else {
        console.log(result)
        failureCount += 1
      }
    })

    console.log(`Updated: ${successCount} `)
  } catch (error) {
    console.error('Error running migration', error)
  } finally {
    console.log(`Failed: ${failureCount} `)
    console.log(`CopiedLastNameInitial: ${copiedLastNameInitial} `)
    console.log(`Total Records Checked: ${totalCount} `)
  }
}

// Maximum batch size to query for
const limit = Number(Config.get('MIGRATION_DOCUMENTS_LIMIT')) || 500
let successCount = 0
let failureCount = 0
let totalCount = 0
let copiedLastNameInitial = 0
main().then(() => console.log('Script Complete \n'))
