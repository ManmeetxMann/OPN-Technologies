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
import {
  OrganizationLocation,
  Organization,
  OrganizationGroup,
} from 'packages/enterprise/src/models/organization'
import {User} from 'packages/common/src/data/user'
import {Passport} from 'packages/passport/src/models/passport'

let now = 1080216000000

export const setNow = async (time: number): Promise<void> => {
  now = time
  await setTime(['Access', 'Passport', 'Enterprise'], now)
}

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

type InitialState = {
  organization: Organization
  group: OrganizationGroup
  users: User[]
  passports: Passport[]
  locations: OrganizationLocation[]
  authIds: string[]
}

export const initialize = async (
  userCount: number,
  locationCount: number,
  startTime: number,
): Promise<InitialState> => {
  await setNow(startTime)

  // servers must be running
  const organization = await createOrg('The Daycare Center')
  const group = await createGroup(organization.id, 'default')
  const groupId = group.id
  const locations = []
  let i = 0
  // for some reason createLocations isn't thread safe, so this is done serially
  // TODO: figure out why
  while (i < locationCount) {
    const name = getName('location', 2)
    const newLoc = await createLocation(organization.id, name)
    locations.push(newLoc)
    i++
  }
  const authIds = locations.map((_, i) => getName(`${i}`, 4))
  const emails = locations.map(() => getEmail())
  await Promise.all(
    locations.map((loc, i) =>
      createAdmin(
        getName('', 1),
        randomSegment().substr(0, 1),
        emails[i],
        [loc.id],
        organization.id,
        authIds[i],
        groupId,
      ),
    ),
  )
  const userCountArr = new Array(userCount)
  userCountArr.fill(0, 0, userCount)
  const users = await Promise.all(
    userCountArr.map(() =>
      createUser(organization.id, getName('user', 3), randomSegment(), groupId).then((user) => ({
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
      organization.id,
    )
  }
  const passports = await Promise.all(
    users.map((user, i) =>
      attest(
        user.id,
        locations[i % locations.length].id,
        false,
        user.dependants.map(({id}) => id),
      ),
    ),
  )
  return {
    organization,
    group,
    users,
    locations,
    authIds,
    passports,
  }
}

export const fakeCheckIns = async (
  users: User[],
  locs: OrganizationLocation[],
  authIds: string[],
  passports: Passport[],
): Promise<void> => {
  // index 0 is whether or not the user is on location, index n is whether dependant n-1 is on location
  const onLocation = users.map(() => null)
  const locIndexes = users.map(() => null)
  const tokens = users.map(() => null)

  const endTime = now + 1000 * 60 * 60 * 2
  // 2 hours of 1 action/minute
  while (now < endTime) {
    // forward one minute
    await setNow(now + 60000)
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
      // @ts-ignore user does have dependants
      const dependantIds = user.dependants
        .map((dep, index) => involved[index + 1] && dep.id)
        .filter((notNull) => notNull)
      const access = await createAccess(
        user.id,
        locs[locationIndex].id,
        passports[userIndex].statusToken,
        dependantIds,
        involved[0],
      )
      tokens[userIndex] = access.token
      await scanEntry(user.id, access.token, authIds[locationIndex])
    } else {
      // user should leave their location
      await scanExit(user.id, tokens[userIndex], authIds[locIndexes[userIndex]])
      locIndexes[userIndex] = null
      tokens[userIndex] = null
    }
  }
  const sickUserIndex = Math.floor(Math.random() * users.length)
  await attest(users[sickUserIndex].id, locs[0].id, true, [])
}
