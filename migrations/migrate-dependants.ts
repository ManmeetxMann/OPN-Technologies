import {initializeApp, credential, firestore} from 'firebase-admin'
import {Config} from '../packages/common/src/utils/config'

const PAGE_SIZE = Number(Config.get('MIGRATION_DOCUMENTS_LIMIT')) || 500

const serviceAccount = JSON.parse(Config.get('FIREBASE_ADMINSDK_SA'))
initializeApp({
  credential: credential.cert(serviceAccount),
})

console.log(`Migrate Dependents: ${serviceAccount.project_id}`)

const DRY = !(process.env.RUN_WITH_APPLY === 'true')
const database = firestore()

let originalUserCount = 0

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
    originalUserCount += page.length
    console.log(`Updating page ${pageIndex + 1} with ${page.length} users in it`)
    if (!DRY) {
      await Promise.all(
        page.map((user) => {
          if (user.data().delegates) {
            console.warn(`${user.id} already has delegates`)
            return
          }
          return user.ref.update({
            delegates: null,
            'timestamps.migrations.addDelegatesArray': firestore.FieldValue.serverTimestamp(),
          })
        }),
      )
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
          'timestamps.migrations.createUserFromDependant': firestore.FieldValue.serverTimestamp(),
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
          const existingUser = await target.get()
          console.warn(`error creating dependant from ${fullPath}, attempting to recover`)
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

async function validateNewUsers(): Promise<void> {
  if (DRY) {
    console.log('skipping validation for dry run')
    return
  }

  console.log('checking dependant creation')

  const collection = database.collection('users')
  const baseQuery = collection.orderBy(firestore.FieldPath.documentId()).limit(PAGE_SIZE)
  let pageIndex = 0
  let after = null
  let dependantCount = 0
  let newUserCount = 0
  while (true) {
    const query = after ? baseQuery.startAfter(after.id) : baseQuery
    const page = (await query.get()).docs
    if (page.length === 0) {
      break
    }
    after = page[page.length - 1]
    console.log(`Validating page ${pageIndex + 1} with ${page.length} users in it`)
    newUserCount += page.length
    await Promise.all(
      page.map(async (user) => {
        const allOriginalDependants = (
          await database.collection(`users/${user.id}/dependants`).get()
        ).docs
        dependantCount += allOriginalDependants.length
        const allNewUsersByDelegate = (
          await collection.where('delegates', 'array-contains', user.id).get()
        ).docs
        const allNewDependantsById = await Promise.all(
          allOriginalDependants.map((dependant) => database.doc(`users/${dependant.id}`).get()),
        )
        allOriginalDependants.forEach((original) => {
          const created = allNewDependantsById.find((dep) => dep.id === original.id)
          if (!created.exists) {
            console.error(
              `missing new user from ${original.ref.path}. They likely do not have a users_group document`,
            )
            return
          }
          if (
            created.data().firstName !== original.data().firstName ||
            created.data().lastName !== original.data().lastName ||
            !created.data().delegates?.includes(user.id)
          ) {
            console.error(`mismatch between ${original.ref.path} and ${created.ref.path}`)
          }
        })
        allNewUsersByDelegate.forEach((created) => {
          if (!allOriginalDependants.some((original) => original.id === created.id)) {
            console.error(`${created.ref.path} does not have a matching dependant for ${user.id}`)
          }
        })
      }),
    )
    pageIndex += 1
  }

  console.log('all dependants verified')
  const expectedUserCount = originalUserCount + dependantCount
  const actualUserCount = newUserCount
  if (newUserCount !== expectedUserCount) {
    console.warn(`expected ${expectedUserCount} users but found ${actualUserCount}`)
  } else {
    console.log(`User count ${actualUserCount} matches expectation`)
  }
}

addDelegates()
  .then(createNewUsers)
  .then(validateNewUsers)
  .then(() => console.log('Script Complete \n'))
