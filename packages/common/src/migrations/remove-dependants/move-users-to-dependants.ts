import DataStore from '../../data/datastore'
import {firestore} from 'firebase-admin'

const PAGE_SIZE = 200

export default async function runMigration(): Promise<void> {
  const ds = new DataStore()
  const orm = ds.firestoreORM
  const fs = firestore()
  const baseQuery = orm
    .collection({path: 'users'})
    .where(new firestore.FieldPath('delegates'), 'not-in', [null, []])
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
        // @ts-ignore
        if (!user.delegates?.length) {
          console.log(`User ${user.id} is not a dependant, continuing`)
          return
        }
        // @ts-ignore
        const parent = user.delegates[0]

        return fs.runTransaction(async (tx) => {
          const deleteRef = fs.collection(`users/`).doc(user.id)
          const createRef = fs.collection(`users/${parent}/dependants/`).doc(user.id)
          tx.delete(deleteRef).create(createRef, {
            registrationId: null,
            // @ts-ignore
            firstName: user.firstName,
            // @ts-ignore
            lastName: user.lastName,
            base64Photo: '',
            // @ts-ignore
            organizationIds: user.organizationIds ?? [],
            // @ts-ignore
            email: user.email ?? null,
            // no admin
            // no authUserId
          })
        })
      }),
    )
  }
}
