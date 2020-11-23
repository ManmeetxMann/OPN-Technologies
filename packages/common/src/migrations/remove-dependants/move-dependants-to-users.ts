import {UserModel, UserDependantModel} from '../../data/user'
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
        const dependantsModel = new UserDependantModel(ds, user.id)
        const dependants = await dependantsModel.fetchAll()
        if (!dependants.length) {
          console.log(`User ${user.id} has no dependants, continuing`)
          return
        }
        const updateResults = await Promise.all(
          dependants.map((dep) =>
            ORM.runTransaction(async (tx) => {
              const deleteRef = ORM.collection({
                path: `users/${user.id}/dependants`,
              }).docRef(dep.id)
              const createRef = ORM.collection({
                path: `users`,
              }).docRef(dep.id)
              tx.delete(deleteRef).create(createRef, {
                registrationId: null,
                firstName: dep.firstName,
                lastName: dep.lastName,
                base64Photo: '',
                organizationIds: user.organizationIds ?? [],
                email: user.email ?? null,
                delegates: [user.id],
                // no admin
                // no authUserId
              })
              // we don't have access to allSettled here
            }).then(
              (result) => ({success: true, result, error: null, dep}),
              (error) => ({success: false, result: null, error, dep}),
            ),
          ),
        )
        updateResults.forEach((result) => {
          if (result.success) {
            console.log(`${user.id} / ${result.dep.id} updated successfully`)
            console.log(JSON.stringify(result))
            return
          }
          console.error(`${user.id} / ${result.dep.id} update failed - ${result.error}`)
        })
      }),
    )
    pageIndex += 1
  }
}

runMigration()
