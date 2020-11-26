import {initializeApp, credential, firestore} from 'firebase-admin'
import {Config} from '../../utils/config'
const serviceAccount = JSON.parse(Config.get('FIREBASE_ADMINSDK_SA'))
initializeApp({
  credential: credential.cert(serviceAccount),
})

const database = firestore()
// const migrationReference = database.collection('2020-11-05t17:00-migrate-handle-onto-products')

// The version of Node we are currently using does not support Promise.allSettled so instead use this polyfill.
// export async function promiseAllSettled(promises: Promise<unknown>[]) {
//   return Promise.all(
//     promises.map((promise) =>
//       promise
//         .then((value) => ({
//           status: 'fulfilled',
//           value,
//         }))
//         .catch((error: unknown) => ({
//           status: 'rejected',
//           reason: error,
//         })),
//     ),
//   )
// }
//
// function logError(documentIdName: string, documentId: string, error: string) {
//   migrationReference.add({
//     [documentIdName]: documentId,
//     error,
//     created: firestore.FieldValue.serverTimestamp(),
//   })
// }
//
// function logActivity(updateData: {[key: string]: unknown}) {
//   return {
//     ...updateData,
//     timestamps: {
//       updated: firestore.FieldValue.serverTimestamp(),
//     },
//     activityLog: firestore.FieldValue.arrayUnion({
//       action: 'Migrate handle onto product',
//       operation: 'update',
//       payload: updateData,
//       timestamp: new Date(),
//     }),
//   }
// }
//
// const sellers: {[key: string]: firestore.DocumentSnapshot<firestore.DocumentData>} = {}
//
// async function setHandle(snapshot: firestore.QueryDocumentSnapshot<firestore.DocumentData>) {
//   const product = snapshot.data()
//   // If the handle is already set, do nothing
//   if (product.sellerHandle) {
//     return Promise.resolve()
//   }
//
//   const handle = sellers[product.sellerId]
//
//   if (!handle) {
//     return logError('customers', product.sellerId, `Seller does not have a handle`)
//   }
//
//   const updateData = logActivity({sellerHandle: handle})
//   try {
//     return snapshot.ref.set(updateData, {merge: true})
//   } catch (error) {
//     await logError('productId', snapshot.id, error.message)
//     throw error
//   }
// }
//
// async function denormalizeHandleOntoProducts() {
//   let offset = 0
//   let hasMore = true
//
//   const results: ({status: string; value: unknown} | {status: string; reason: unknown})[] = []
//
//   while (hasMore) {
//     const snapshot = await database.collection('product').offset(offset).limit(limit).get()
//     offset += snapshot.docs.length
//     hasMore = !snapshot.empty
//
//     const uniqueSellers = new Set<string>()
//     for (let i = 0; i < snapshot.docs.length; i += 1) {
//       uniqueSellers.add(snapshot.docs[i].data().sellerId)
//     }
//
//     const promises = []
//     for (let i = 0; i < snapshot.docs.length; i += 1) {
//       promises.push(setHandle(snapshot.docs[i]))
//     }
//
//     const result = await promiseAllSettled(promises)
//     results.push(...result)
//   }
//
//   return results
// }
//
// async function verifyMigration() {
//   let offset = 0
//   let hasMore = true
//   while (hasMore) {
//     const snapshot = await database.collection('product').offset(offset).limit(limit).get()
//     offset += snapshot.docs.length
//     hasMore = !snapshot.empty
//
//     const failedProducts: string[] = []
//     snapshot.docs.forEach((product) => {
//       if (!product.data()?.sellerHandle) {
//         failedProducts.push(product.id)
//       }
//     })
//
//     if (failedProducts.length > 0) {
//       console.error('Migration failed to update products', JSON.stringify(failedProducts, null, 2))
//     }
//   }
//   console.log(`Verified ${offset} products`)
// }
//
async function main() {
  let offset = 0
  const organizationSnapshot = await database.collection('organizations').offset(offset).limit(limit).get()
  organizationSnapshot.docs.forEach(async (doc) => {
    const groups = await database.collection('organizations').doc(doc.id).collection('organization_groups').get()
    groups.docs.forEach(async (group) => {
      console.log(doc.id, group.id)
    })
  })
  // try {
  //   console.log('Migration Starting')
  //   const results = await migrateDependentsFromSubcollectionTo()
  //   results.forEach((result) => {
  //     if (result.status === 'fulfilled') {
  //       // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
  //       // @ts-ignore - We will always have a value if the status is fulfilled
  //       if (result.value) {
  //         successCount += 1
  //       }
  //     } else {
  //       failureCount += 1
  //     }
  //   })
  //
  //   console.log(`Succesfully updated ${successCount} products`)
  //   await verifyMigration()
  //   console.log('Migration completed successfully')
  // } catch (error) {
  //   console.error('Error running migration', error)
  // } finally {
  //   if (failureCount > 0) {
  //     console.warn(
  //       `Failed updating ${failureCount} produccts, please check collection 2020-11-05t17:00-migrate-handle-onto-products for logs`,
  //     )
  //   }
  //   console.log('Script Complete \n')
  // }
}

// Maximum batch size to query for
const limit = 500
let successCount = 0
let failureCount = 0
main().then().catch((err) => console.log(err))
