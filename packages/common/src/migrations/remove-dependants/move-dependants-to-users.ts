import {UserDependantModel} from '../../data/user'
import DataStore from '../../data/datastore'
import {firestore} from 'firebase-admin'

const PAGE_SIZE = 200

export default async function runMigration(): Promise<void> {
  const ds = new DataStore()
  const orm = ds.firestoreORM
  const fs = firestore()
  const baseQuery = orm
    .collection({path: 'users'})
    .where(new firestore.FieldPath('delegates'), '==', null)
    .limit(PAGE_SIZE)
  let startAfter = null
  while (true) {
    const query = startAfter ? baseQuery.startAfter(startAfter) : baseQuery
    const userPage = await query.fetch()
    if (userPage.length === 0) {
      break
    }
    startAfter = {
      id: userPage[userPage.length - 1].id,
    }
    await Promise.all(
      userPage.map(async (user) => {
        const dependantsModel = new UserDependantModel(ds, user.id)
        const dependants = await dependantsModel.fetchAll()
        if (!dependants.length) {
          console.log(`User ${user.id} has no dependants, continuing`)
          return
        }
        const updateResults = await Promise.all(
          dependants.map((dep) =>
            fs
              .runTransaction(async (tx) => {
                const createRef = fs.collection('users').doc(dep.id)
                tx.create(createRef, {
                  registrationId: null,
                  firstName: dep.firstName ?? null,
                  lastName: dep.lastName ?? null,
                  base64Photo: '',
                  // @ts-ignore
                  organizationIds: user.organizationIds ?? [],
                  // @ts-ignore
                  email: user.email ?? null,
                  delegates: [user.id],
                  migrated: true,
                  // no admin
                  // no authUserId
                })
                // we don't have access to allSettled here
              })
              .then(
                (result) => ({success: true, result, error: null, dep}),
                (error) => ({success: false, result: null, error, dep}),
              ),
          ),
        )
        updateResults.forEach((result) => {
          if (result.success) {
            console.log(`${user.id} / ${result.dep.id} updated successfully`)
            console.log(JSON.stringify(result.result))
            return
          }
          console.error(`${user.id} / ${result.dep.id} update failed - ${result.error}`)
        })
      }),
    )
  }
}
