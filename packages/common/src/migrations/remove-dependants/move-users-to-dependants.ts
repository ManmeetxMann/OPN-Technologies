import {UserModel} from '../../data/user'
import DataStore from '../../data/datastore'
const PAGE_SIZE = 200
export default async function runMigration(): Promise<void> {
  const ds = new DataStore()
  const ORM = ds.firestoreORM
  const userModel = new UserModel(ds)
  let pageIndex = 0
  while (true) {
    const allUsers = await userModel.fetchAllWithPagination(pageIndex, PAGE_SIZE)
    if (allUsers.length === 0) {
      break
    }
    await Promise.all(
      allUsers.map(async (user) => {
        if (!user.delegates?.length) {
          console.log(`User ${user.id} is not a dependant, continuing`)
          return
        }
        const parent = user.delegates[0]

        return ORM.runTransaction(async (tx) => {
          const deleteRef = ORM.collection({
            path: `users/`,
          }).docRef(user.id)
          const createRef = ORM.collection({
            path: `users/${parent}/dependants/`,
          }).docRef(user.id)
          tx.delete(deleteRef).create(createRef, {
            registrationId: null,
            firstName: user.firstName,
            lastName: user.lastName,
            base64Photo: '',
            organizationIds: user.organizationIds ?? [],
            email: user.email ?? null,
            // no admin
            // no authUserId
          })
        })
      }),
    )
    pageIndex += 1
  }
}
