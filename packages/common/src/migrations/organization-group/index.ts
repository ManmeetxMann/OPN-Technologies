import {initializeApp, credential, firestore} from 'firebase-admin'
import {Config} from '../../utils/config'
import {changeAllOrganizationGroup, verifyMigration} from './organization-groups-edit'
const serviceAccount = JSON.parse(Config.get('FIREBASE_ADMINSDK_SA'))
initializeApp({
  credential: credential.cert(serviceAccount),
})

const database = firestore()

async function main() {
  try {
    console.log('Migration Starting')
    const results = await changeAllOrganizationGroup(database, limit)
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        // @ts-ignore - We will always have a value if the status is fulfilled
        if (result.value) {
          successCount += 1
        }
      } else {
        failureCount += 1
      }
    })

    console.log(`Succesfully updated ${successCount} groups`)
    await verifyMigration(database, limit)
    console.log('Migration completed successfully')
  } catch (error) {
    console.error('Error running migration', error)
  } finally {
    if (failureCount > 0) {
      console.warn(`Failed updating ${failureCount} groups`)
    }
  }
}

// Maximum batch size to query for
const limit = Number(Config.get('MIGRATION_DOCUMENTS_LIMIT')) || 500
let successCount = 0
let failureCount = 0
main().then(() => console.log('Script Complete \n'))
