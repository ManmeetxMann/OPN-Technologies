import {
  attest,
  createOrg,
  createLoc,
  createAdmin,
  createUser,
  createAccess,
  setTime,
  scanEntry,
  scanExit,
} from './utils'

let now = 1080216000000

const nameSegs = [
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
const randSeg = () => nameSegs[Math.floor(Math.random() * nameSegs.length)]

// two segments is 99% likely to be unique for 7 elements
// three segments is 99% likely to be unique for 180 elements
const getName = (prefix: string, segments: number): string => {
  const arr = new Array(segments)
  arr.fill(0, 0, segments)
  const segs = arr.map(randSeg)
  return [prefix, ...segs].filter((exists) => exists).join('-')
}

const getEmail = () => `${getName('', 2)}@stayopn.com`.toLowerCase()

const LOC_COUNT = 7
const USER_COUNT = 50

const generate = async () => {
  await setTime(['Access', 'Passport', 'Enterprise'], now)

  // servers must be running
  const org = await createOrg('The Daycare Center')
  const locs = []
  let i = 0
  // for some reason createLocations isn't thread safe, so this is done serially
  // TODO: figure out why
  while (i < LOC_COUNT) {
    const name = getName('location', 2)
    const newLoc = await createLoc(org.id, name)
    // console.log(i, name, newLoc)
    locs.push(newLoc)
    i++
  }
  //   console.log(locs.length)
  const authIds = locs.map((_, i) => getName(`${i}`, 2))
  const emails = locs.map(() => getEmail())
  const admins = await Promise.all(
    locs.map((loc, i) =>
      createAdmin(
        org.key,
        getName('', 1),
        randSeg().substr(0, 1),
        emails[i],
        loc.id,
        org.id,
        authIds[i],
      ),
    ),
  )
  const userCountArr = new Array(USER_COUNT)
  userCountArr.fill(0, 0, USER_COUNT)
  const users = await Promise.all(
    userCountArr.map(() => createUser(org.key, getName('user', 3), randSeg().substr(0, 1))),
  )
  const attestations = await Promise.all(
    users.map((user, i) => attest(user.id, locs[i % locs.length].id, false)),
  )

  const activeAccesses = users.map(() => null)
  const locIndexes = users.map(() => null)

  const endTime = now + 1000 * 60 * 60 * 2
  // 2 hours of 1 action/minute
  while (now < endTime) {
    now += 60000 // forward one minute
    // console.log(now)
    await setTime(['Access', 'Passport', 'Enterprise'], now)
    // pick a user at random to act
    const userIndex = Math.floor(Math.random() * users.length)
    if (!activeAccesses[userIndex]) {
      // user should enter a location
      // pick one at random
      const locationIndex = Math.floor(Math.random() * locs.length)
      locIndexes[userIndex] = locationIndex
      const access = await createAccess(
        users[userIndex].id,
        locs[locationIndex].id,
        attestations[userIndex].statusToken,
      )
      activeAccesses[userIndex] = access
      await scanEntry(users[userIndex].id, access.token, authIds[locationIndex])
    } else {
      // user should leave their location
      const access = activeAccesses[userIndex]
      const locIndex = locIndexes[userIndex]
      activeAccesses[userIndex] = null
      await scanExit(users[userIndex].id, access.token, authIds[locIndex])
    }
  }
  const sickUserIndex = Math.floor(Math.random() * users.length)
  await attest(users[sickUserIndex].id, locs[0].id, true)
}

generate()
