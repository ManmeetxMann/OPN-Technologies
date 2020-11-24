// up
import addArray from './add-delegate-array'
import createUsers from './move-dependants-to-users'

// down
import removeArray from './remove-delegate-array'
import createDependantsAndDeleteUsers from './move-users-to-dependants'

const [method] = process.argv.slice(2)

if (method === 'up') {
  ;(async () => {
    await addArray()
    await createUsers()
  })()
} else if (method === 'down') {
  ;(async () => {
    await createDependantsAndDeleteUsers()
    await removeArray()
  })()
} else {
  console.error(`${method} is not a valid method - use 'up' or 'down'`)
}
