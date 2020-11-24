import {UserModel} from '../../data/user'
import DataStore from '../../data/datastore'
import {FieldValue} from '@google-cloud/firestore'

const PAGE_SIZE = 200
export default async function runMigration(): Promise<void> {
  console.log('running migration')
  const model = new UserModel(new DataStore())
  let pageIndex = 0
  while (true) {
    const allUsers = await model.fetchAllWithPagination(pageIndex, PAGE_SIZE)
    if (allUsers.length === 0) {
      break
    }
    console.log(`Updating page ${pageIndex + 1} with ${allUsers.length} users in it`)
    await Promise.all(
      allUsers.map((user) => {
        if (user.delegates?.length) {
          throw 'Cannot remove a delegate array that still has users'
        }
        return model.updateProperty(user.id, 'delegates', FieldValue.delete)
      }),
    )
    console.log(`Update complete`)
    pageIndex += 1
  }
  console.log('migration complete')
}
