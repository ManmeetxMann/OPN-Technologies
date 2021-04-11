/**
 
 */
import {initializeApp, credential, firestore} from 'firebase-admin'
import {Config} from '../packages/common/src/utils/config'

const serviceAccount = JSON.parse(Config.get('FIREBASE_ADMINSDK_SA'))
initializeApp({
  credential: credential.cert(serviceAccount),
})
console.log(`Count Users: ${serviceAccount.project_id}`)

const database = firestore()

async function main() {
  try {
    console.log('Starting Count')
    let after = null
    const baseQuery = database.collection('users')
    //.where('organizationIds', 'array-contains', 'PPTEST')
    const queryWithLimit = baseQuery.orderBy(firestore.FieldPath.documentId()).limit(limit)
    let pageIndex = 0
    while (true) {
      const query = after ? queryWithLimit.startAfter(after.id) : queryWithLimit
      const page = (await query.get()).docs
      if (page.length === 0) {
        break
      }
      after = page[page.length - 1]
      totalCount += page.length
      pageIndex += 1
      console.log(`On Page: ${pageIndex}`)
    }
  } catch (error) {
    console.error('Error running migration', error)
  } finally {
    console.log(`Total Users: ${totalCount} `)
  }
}

const limit = 500
let totalCount = 0
main().then(() => console.log('Script Complete \n'))
