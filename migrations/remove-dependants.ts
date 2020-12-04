import {initializeApp, credential, firestore} from 'firebase-admin'
import {Config} from '../packages/common/src/utils/config'

const PAGE_SIZE = Number(Config.get('MIGRATION_DOCUMENTS_LIMIT')) || 500

const serviceAccount = JSON.parse(Config.get('FIREBASE_ADMINSDK_SA'))
initializeApp({
  credential: credential.cert(serviceAccount),
})

const DRY = false
const database = firestore()

async function addDelegates(): Promise<void> {
  console.log('adding delegates:null to all users')
  const collection = database.collection('users')
  const baseQuery = collection.orderBy(firestore.FieldPath.documentId()).limit(PAGE_SIZE)
  let pageIndex = 0
  let after = null
  while (true) {
    const query = after ? baseQuery.startAfter(after.id) : baseQuery
    const page = (await query.get()).docs
    if (page.length === 0) {
      break
    }
    after = page[page.length - 1]
    console.log(`Updating page ${pageIndex + 1} with ${page.length} users in it`)
    if (!DRY) {
      await Promise.all(page.map((user) => user.ref.update({delegates: null})))
    }
    console.log(`Update complete`)
    pageIndex += 1
  }
  console.log('all users now have delegates:null')
}

async function createNewUsers(): Promise<void> {
  console.log('creating dependant users for all users')
  const collectionGroup = database.collectionGroup('users_groups')
  const baseQuery = collectionGroup.orderBy(firestore.FieldPath.documentId()).limit(PAGE_SIZE)
  let pageIndex = 0
  let after = null
  while (true) {
    const query = after ? baseQuery.startAfter(after.ref.path) : baseQuery
    const page = (await query.get()).docs
    if (page.length === 0) {
      break
    }
    after = page[page.length - 1]
    console.log(`Updating page ${pageIndex + 1} with ${page.length} users_groups in it`)
    await Promise.all(
      page.map(async (userGroup) => {
        // we have the userGroup for this dependant, we need to get the user
        const data = userGroup.data()
        const {parentUserId} = data
        if (!parentUserId) {
          return
        }
        const target = database.doc(`users/${data.userId}`)
        // the current dependant
        const currentDoc = await database
          .doc(`users/${parentUserId}/dependants/${data.userId}`)
          .get()

        if (!currentDoc.exists) {
          console.warn(
            `no dependant found at users/${parentUserId}/dependants/${data.userId}, Check ${userGroup.ref.path}`,
          )
          // probably deleted
          return
        }
        const current = currentDoc.data()
        const fullPath = userGroup.ref.path
        const orgId = fullPath.split('/')[1]
        const newDependant = {
          firstName: current.firstName,
          lastName: current.lastName,
          organizations: [orgId],
          delegates: [parentUserId],
          base64Photo: '',
          registrationId: '',
        }
        // fails if already exists
        try {
          console.log(`Creating ${JSON.stringify(newDependant)} at users/${data.userId}`)
          if (DRY) {
            const t = await target.get()
            if (t.exists) {
              throw new Error('Already exists')
            }
          } else {
            await target.create(newDependant)
          }
        } catch (err) {
          console.warn(`error creating dependant from ${fullPath}, attempting to recover`)
          const existingUser = await target.get()
          if (!existingUser.exists) {
            console.error("couldn't recover - user is not a duplicate")
            return
          }
          const data = existingUser.data()
          if (
            data.firstName === newDependant.firstName &&
            data.lastName === newDependant.lastName &&
            data.delegates?.includes(parentUserId)
          ) {
            // it's a duplicate
            console.warn(`Check ${userGroup.ref.path}, it may be a duplicate`)
            console.warn(`Not creating ${JSON.stringify(newDependant)}`)
          } else {
            console.error(
              `couldn't recover - id in use, but ${JSON.stringify(
                data,
              )} is not similar to ${JSON.stringify(newDependant)}`,
            )
          }
        }
      }),
    )
    console.log(`Update complete`)
    pageIndex += 1
  }
  console.log('all dependants now have corresponding users')
}

addDelegates()
  .then(createNewUsers)
  .then(() => console.log('Script Complete \n'))
