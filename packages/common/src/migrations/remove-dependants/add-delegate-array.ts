import DataStore from '../../data/datastore'
const PAGE_SIZE = 200
export default async function runMigration(): Promise<void> {
  console.log('running migration')
  const ds = new DataStore()
  const orm = ds.firestoreORM
  let pageIndex = 0
  let after = null
  while (true) {
    const baseQuery = orm.collection({path: 'users'}).limit(PAGE_SIZE)
    const query = after ? baseQuery.startAfter(after) : baseQuery
    const page = await query.fetch()
    if (page.length === 0) {
      break
    }
    after = {
      id: page[page.length - 1].id,
    }
    console.log(`Updating page ${pageIndex + 1} with ${page.length} users in it`)
    await Promise.all(
      page.map((user) => orm.collection({path: 'users'}).docRef(user.id).update({delegates: null})),
    )
    console.log(`Update complete`)
    pageIndex += 1
  }
  console.log('migration complete')
}
