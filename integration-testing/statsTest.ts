/* eslint-disable prettier/prettier */
import {initialize, setNow} from './dataGen'
import {createAccess, scanEntry, scanExit, getStats} from './utils'

/*
    We have 6 users:
    0: never checks in
    1: checks in, never checks out
    2: checks in a dependant, never checks out
    3: checks in, checks in a dependant, then checks out but leaves the dependant
    4: checks in, checks in a dependant, then they both leave
    5: checks in, checks out, checks in again
*/

const startTime = 1444478400000

const sequence = [
  [ // start of day check in
    {user: 1, person: 0},
    {user: 2, person: 1},
    {user: 3, person: 0},
    {user: 3, person: 1},
    {user: 4, person: 0},
    {user: 4, person: 1},
    {user: 5, person: 0},
  ],
  [ // check out after an hour
    {user: 3, person: 0},
    {user: 4, person: 0},
    {user: 4, person: 1},
    {user: 5, person: 0},
  ],
  [ // check back in
    {user: 5, person: 0},
  ],
]

const TICK_LENGTH = 60 * 60 * 1000

const runStatsTest = async (): Promise<void> => {
  const initialState = await initialize(6, 1, startTime - TICK_LENGTH)
  const accessTokens = initialState.users.map(() => [null, null, null])
  const checkInOrOut = async (user: number, person: number): Promise<void> => {
    const tokenToMove = accessTokens[user][person]
    if (!tokenToMove) {
      // check in
      const access = await createAccess(
        initialState.users[user].id,
        initialState.locations[0].id,
        initialState.passports[user].statusToken,
        // @ts-ignore user does have dependants
        person === 0 ? [] : [initialState.users[user].dependants[person - 1].id],
        person === 0,
      )
      const entry = await scanEntry(initialState.users[user].id, access.token,initialState.authIds[0])
      // @ts-ignore not unknown to me tbh
      accessTokens[user][person] = entry.access.token
    } else {
      const exit = await scanExit(initialState.users[user].id,tokenToMove, initialState.authIds[0])
      accessTokens[user][person] = null
    }
  }

  let seqNum = 0
  while (seqNum < sequence.length) {
    await setNow(startTime + (seqNum * TICK_LENGTH))
    await Promise.all(sequence[seqNum].map((action) => checkInOrOut(action.user, action.person)))
    seqNum ++
  }
  await setNow(startTime + (seqNum * TICK_LENGTH))
  const result = await getStats(initialState.organization.id, initialState.authIds[0])
  const prnt = r => `entered: ${r.enteredAt}, exit: ${r.exitAt}, ${r.id}`
  initialState.users.forEach((user, index) => {
    // @ts-ignore
    console.log(`User ${index}, guardian   `, prnt(result.accesses.find(acc => acc.userId === user.id)))
    // @ts-ignore
    console.log(`User ${index}, dependant 1`, prnt(result.accesses.find(acc => acc.userId === user.dependants[0].id)))
    // @ts-ignore
    console.log(`User ${index}, dependant 2`, prnt(result.accesses.find(acc => acc.userId === user.dependants[1].id)))
  })
}

runStatsTest()
