import {UserModel, UserDependantModel} from '../../data/user'
import DataStore from '../../data/datastore'
import {firestore} from 'firebase-admin'
export default async function runMigration(): Promise<void> {
  const ds = new DataStore()
  const userModel = new UserModel(ds)
  const ORM = firestore()
  let pageIndex = 0
  // we have to fetch all of the users at once as we're adding user records
  const allUsers = await userModel.fetchAll()
  while (true) {
    const userPage = allUsers.slice(pageIndex * 200, (pageIndex + 1) * 200)
    if (userPage.length === 0) {
      break
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
            ORM.runTransaction(async (tx) => {
              // const deleteRef = ORM.collection({
              //   path: `users/${user.id}/dependants`,
              // }).docRef(dep.id)
              const createRef = ORM.collection('users').doc(dep.id)
              tx
                //.delete(deleteRef)
                .create(createRef, {
                  registrationId: null,
                  firstName: dep.firstName ?? null,
                  lastName: dep.lastName ?? null,
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
