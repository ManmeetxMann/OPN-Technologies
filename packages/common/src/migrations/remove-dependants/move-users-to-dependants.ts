import {UserModel} from '../../data/user'
import DataStore from '../../data/datastore'
import {firestore} from 'firebase-admin'
const PAGE_SIZE = 200
export default async function runMigration(): Promise<void> {
  const ds = new DataStore()
  const ORM = firestore()
  const userModel = new UserModel(ds)
  let pageIndex = 0
  const allUsers = await userModel.fetchAll()
  while (true) {
    const userPage = allUsers.slice(PAGE_SIZE * 200, (pageIndex + 1) * PAGE_SIZE)
    if (userPage.length === 0) {
      break
    }
    await Promise.all(
      userPage.map(async (user) => {
        if (!user.delegates?.length) {
          console.log(`User ${user.id} is not a dependant, continuing`)
          return
        }
        const parent = user.delegates[0]

        return ORM.runTransaction(async (tx) => {
          const deleteRef = ORM.collection(`users/`).doc(user.id)
          const createRef = ORM.collection(`users/${parent}/dependants/`).doc(user.id)
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
