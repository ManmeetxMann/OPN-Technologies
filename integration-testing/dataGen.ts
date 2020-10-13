import {
  attest,
  createOrg,
  createGroup,
  createLocation,
  createAdmin,
  createUser,
  createDependants,
  createAccess,
  setTime,
  scanEntry,
  scanExit,
} from './utils'

let now = 1080216000000

const nameSegments = [
  'Alfa',
  'Bravo',
  'Charlie',
  'Delta',
  'Echo',
  'Foxtrot',
  'Golf',
  'Hotel',
  'India',
  'Juliett',
  'Kilo',
  'Lima',
  'Mike',
  'November',
  'Oscar',
  'Papa',
  'Quebec',
  'Romeo',
  'Sierra',
  'Tango',
  'Uniform',
  'Victor',
  'Whiskey',
  'Xray',
  'Yankee',
  'Zulu',
]
// Alfa++++
// November
// 4 chars variance/word
const randomSegment = () => nameSegments[Math.floor(Math.random() * nameSegments.length)]

// two segments is 99% likely to be unique for 7 elements
// three segments is 99% likely to be unique for 180 elements
const getName = (prefix: string, segments: number): string => {
  const arr = new Array(segments)
  arr.fill(0, 0, segments)
  const segs = arr.map(randomSegment)
  return [prefix, ...segs].filter((exists) => exists).join('-')
}

// give an array of three booleans where at least one is true
const randomPick = (): boolean[] => {
  const pick = [0.5, 0.5, 0.5].map((bias) => Math.random() < bias)
  if (pick.some((selected) => selected)) {
    return pick
  }
  return randomPick()
}

const getEmail = () => `${getName('', 2)}@stayopn.com`.toLowerCase()

const LOCATION_COUNT = 7
const USER_COUNT = 50

const generate = async () => {
  await setTime(['Access', 'Passport', 'Enterprise'], now)

  // servers must be running
  const org = await createOrg('The Daycare Center')
  const group = await createGroup(org.id, 'default')
  const groupId = group.id
  const locs = []
  let i = 0
  // for some reason createLocations isn't thread safe, so this is done serially
  // TODO: figure out why
  while (i < LOCATION_COUNT) {
    const name = getName('location', 2)
    const newLoc = await createLocation(org.id, name)
    // console.log(i, name, newLoc)
    locs.push(newLoc)
    i++
  }
  //   console.log(locs.length)
  const authIds = locs.map((_, i) => getName(`${i}`, 2))
  const emails = locs.map(() => getEmail())
  await Promise.all(
    locs.map((loc, i) =>
      createAdmin(
        getName('', 1),
        randomSegment().substr(0, 1),
        emails[i],
        [loc.id],
        org.id,
        authIds[i],
        groupId,
      ),
    ),
  )
  const userCountArr = new Array(USER_COUNT)
  userCountArr.fill(0, 0, USER_COUNT)
  const users = await Promise.all(
    userCountArr.map(() =>
      createUser(org.id, getName('user', 3), randomSegment(), groupId).then((user) => ({
        ...user,
        dependants: [],
      })),
    ),
  )
  for (const user of users) {
    user.dependants = await createDependants(
      user.id,
      [0, 0].map(() => ({
        firstName: getName('dep', 3),
        lastName: user.lastName,
        groupId,
      })),
      org.id,
    )
  }
  const attestations = await Promise.all(
    users.map((user, i) =>
      attest(
        user.id,
        locs[i % locs.length].id,
        false,
        user.dependants.map(({id}) => id),
      ),
    ),
  )

  // index 0 is whether or not the user is on location, index n is whether dependant n-1 is on location
  const onLocation = users.map(() => null)
  const locIndexes = users.map(() => null)

  const endTime = now + 1000 * 60 * 60 * 2
  // 2 hours of 1 action/minute
  while (now < endTime) {
    now += 60000 // forward one minute
    // console.log(now)
    await setTime(['Access', 'Passport', 'Enterprise'], now)
    // pick a user at random to act
    const userIndex = Math.floor(Math.random() * users.length)
    const user = users[userIndex]
    if (locIndexes[userIndex] === null) {
      // user should enter a location
      // pick one at random
      const locationIndex = Math.floor(Math.random() * locs.length)
      locIndexes[userIndex] = locationIndex
      const involved = randomPick()
      onLocation[userIndex] = involved
      const dependantIds = user.dependants
        .map((dep, index) => involved[index + 1] && dep.id)
        .filter((notNull) => notNull)
      const access = await createAccess(
        user.id,
        locs[locationIndex].id,
        attestations[userIndex].statusToken,
        dependantIds,
        involved[0],
      )
      await scanEntry(user.id, access.token, authIds[locationIndex])
    } else {
      // user should leave their location
      const locIndex = locIndexes[userIndex]
      locIndexes[userIndex] = null
      const involved = onLocation[userIndex]
      const dependantIds = user.dependants
        .map((dep, index) => involved[index + 1] && dep.id)
        .filter((notNull) => notNull)
      const access = await createAccess(
        user.id,
        locs[locIndex].id,
        attestations[userIndex].statusToken,
        dependantIds,
        involved[0],
      )
      await scanExit(user.id, access.token, authIds[locIndex])
    }
  }
  const sickUserIndex = Math.floor(Math.random() * users.length)
  await attest(users[sickUserIndex].id, locs[0].id, true, [])
}

generate()
