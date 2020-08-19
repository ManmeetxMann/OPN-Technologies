import {createOrg, createLoc, createAdmin, setTime} from './utils'

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
const randSeg = () => nameSegs[Math.floor(Math.random() * nameSegs.length)]

// two segments is 99% likely to be unique for 7 elements
// three segments is 99% likely to be unique for 180 elements
const getName = (prefix: string, segments: number): string => {
  const arr = new Array(segments)
  arr.fill(0, 0, segments)
  const segs = arr.map(randSeg)
  return [prefix, ...segs].filter((exists) => exists).join('-')
}

const getEmail = () => `${getName('', 2)}@stayopn.com`

const LOC_COUNT = 7

const generate = async () => {
  await setTime(['Access', 'Passport', 'Enterprise'], 1080216000000)

  // servers must be running
  const org = await createOrg('The Daycare Center')
  const locs = []
  let i = 0
  // for some reason createLocations isn't thread safe, so this is done serially
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
        randSeg(),
        randSeg().substr(0, 1),
        emails[i],
        loc.id,
        org.id,
        authIds[i],
      ),
    ),
  )
  console.log(admins)
}

generate()
