import {Config} from '../packages/common/src/utils/config'

import {initializeApp, credential, firestore} from 'firebase-admin'
import * as _ from 'lodash'

const serviceAccount = JSON.parse(Config.get('FIREBASE_ADMINSDK_SA'))
// Maximum batch size to query for
const limit = Number(Config.get('MIGRATION_DOCUMENTS_LIMIT')) || 500

initializeApp({
  credential: credential.cert(serviceAccount),
})

const database = firestore()

async function updateAllAttestationsForOrganization(orgId): Promise<void> {
  const locCollection = database.collection(`organizations/${orgId}/locations`)
  // location count per org is too small to paginate fetch
  const allLocationIds = (await locCollection.get()).docs.map((loc) => loc.id)
  const chunks: string[][] = _.chunk(allLocationIds, 10)
  await Promise.all(
    chunks.map(async (locIds) => {
      console.log(`Updating attestations for locations ${locIds.join(', ')}`)
      let offset = 0
      const baseQuery = database
        .collection(`attestations`)
        .where('locationId', 'in', locIds)
        .limit(limit)
      while (true) {
        const attestations = (await baseQuery.offset(offset).get()).docs
        if (!attestations.length) {
          break
        }
        offset += attestations.length
        await Promise.all(attestations.map((att) => setOrganizationId(att, orgId)))
      }
    }),
  )
}

async function setOrganizationId(
  snapshot: firestore.QueryDocumentSnapshot<firestore.DocumentData>,
  organizationId: string,
) {
  return snapshot.ref.set(
    {
      organizationId,
      timestamps: {
        migratedAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      },
    },
    {merge: true},
  )
}

async function main() {
  try {
    console.log('Migration Starting')
    const allOrgs = (await database.collection('organizations').get()).docs.map((doc) => doc.id)
    for (const orgId of allOrgs) {
      console.log(`Migrating attestations for organization ${orgId}`)
      await updateAllAttestationsForOrganization(orgId)
    }
    console.log(`Succesfully updated attestations for ${allOrgs.length} organizations`)
  } catch (error) {
    console.error('Error running migration', error)
  }
}

main().then(() => console.log('Script Complete \n'))
