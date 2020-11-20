// import * as _ from 'lodash'

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
          return
        }
        await Promise.all(
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
            }),
          ),
        )
      }),
    )
    pageIndex += 1
  }
}

runMigration()
