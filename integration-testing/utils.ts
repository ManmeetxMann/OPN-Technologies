import fetch from 'node-fetch'

import type {
  Organization,
  OrganizationLocation,
} from '../packages/enterprise/src/models/organization'
import type {Passport} from '../packages/passport/src/models/passport'
import type {Access} from '../packages/access/src/models/access'
import type {User} from '../packages/common/src/data/user'

type Service = 'Config' | 'Access' | 'Enterprise' | 'Lookup' | 'Passport' | 'Registry'

const roots = {
  Config: 'http://localhost:5001',
  Access: 'http://localhost:5002',
  Enterprise: 'http://localhost:5003',
  Lookup: 'http://localhost:5004',
  Passport: 'http://localhost:5005',
  Registry: 'http://localhost:5006',
}

// useful for debugging
// const logAndContinue = (param: unknown) => {
//   console.log(param)
//   return param
// }

type NodeResponse = {
  json: () => Promise<{
    data: unknown
  }>
}

const getData = (response: NodeResponse) => response.json().then(({data}) => data)

const _headers = {'Content-Type': 'application/json'}
const post = (url: string, body: unknown) =>
  fetch(url, {method: 'POST', headers, body: JSON.stringify(body)})

export const setTime = async (services: Service[], milliseconds: number): Promise<void> => {
  await Promise.all(
    services.map((svc) =>
      fetch(`${roots[svc]}/setTime`, {
        method: 'POST',
        body: JSON.stringify({milliseconds}),
        headers: {'Content-Type': 'application/json'},
      }),
    ),
  )
}

export const createOrg = async (name: string): Promise<Organization> => {
  return fetch(`${roots.Enterprise}/organizations`, {
    method: 'POST',
    body: JSON.stringify({name}),
    headers: {'Content-Type': 'application/json'},
  }).then(getData)
}

export const createLoc = async (
  organizationId: string,
  title: string,
): Promise<OrganizationLocation> => {
  return fetch(`${roots.Enterprise}/organizations/${organizationId}/locations`, {
    method: 'POST',
    body: JSON.stringify([
      {
        title,
        address: 'someAddress',
        attestationRequired: true,
        city: 'Toronto',
        country: 'CA',
        state: 'ON',
        zip: 'MV5 1P1',
      },
    ]),
    headers: {'Content-Type': 'application/json'},
  })
    .then(getData)
    .then((data) => data.find((r: OrganizationLocation) => r.title === title))
}

export const createAdmin = async (
  key: number,
  firstName: string,
  lastNameInitial: string,
  email: string,
  locationIds: string[],
  organizationId: string,
  authUserId: string,
): Promise<User> => {
  await fetch(`${roots.Enterprise}/internal/adminApproval/create`, {
    method: 'POST',
    body: JSON.stringify({
      email,
      locationIds,
      organizationId,
    }),
    headers: {'Content-Type': 'application/json'},
  })
  const user = await createUser(key, firstName, lastNameInitial)
  await fetch(`${roots.Enterprise}/admin/auth/signIn/request`, {
    method: 'POST',
    body: JSON.stringify({
      email,
      // @ts-ignore
      connectedId: user.id,
    }),
    headers: {'Content-Type': 'application/json'},
  })
  await fetch(`${roots.Enterprise}/admin/auth/signIn/process`, {
    method: 'POST',
    body: JSON.stringify({
      idToken: `${authUserId}///${email}`,
      // @ts-ignore
      connectedId: user.id,
    }),
    headers: {'Content-Type': 'application/json'},
  })
  return user
}

export const createUser = async (
  key: number,
  firstName: string,
  lastNameInitial: string,
): Promise<User> => {
  return fetch(`${roots.Enterprise}/user/connect/add`, {
    method: 'POST',
    body: JSON.stringify({
      key,
      firstName,
      lastNameInitial,
      birthYear: 1999,
      base64Photo: 'www.google.com',
    }),
    headers: {'Content-Type': 'application/json'},
  })
    .then(getData)
    .then((data) => data.user)
}

export const attest = async (
  userId: string,
  locationId: string,
  exposed: boolean,
): Promise<Passport> => {
  return fetch(`${roots.Passport}/user/status/update`, {
    method: 'POST',
    body: JSON.stringify({
      statusToken: '',
      userId,
      includeGuardian: true,
      dependantIds: [],
      locationId,
      answers: {
        1: {1: exposed},
        2: {1: false},
        3: {1: false},
        4: {1: false, 2: '2020-06-10T05:05:32.217Z'},
      },
    }),
    headers: {'Content-Type': 'application/json'},
  }).then(getData)
}

export const createAccess = async (
  userId: string,
  locationId: string,
  statusToken: string,
): Promise<Access> => {
  return fetch(`${roots.Access}/user/createToken`, {
    method: 'POST',
    body: JSON.stringify({
      userId,
      statusToken,
      locationId,
      dependantIds: [],
      includeGuardian: true,
    }),
    headers: {'Content-Type': 'application/json'},
  }).then(getData)
}

export const scanEntry = async (
  userId: string,
  accessToken: string,
  authId: string,
): Promise<unknown> => {
  return fetch(`${roots.Access}/admin/enter`, {
    method: 'POST',
    body: JSON.stringify({
      userId,
      accessToken,
    }),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authId}`,
    },
  }).then(getData)
}

export const scanExit = async (
  userId: string,
  accessToken: string,
  authId: string,
): Promise<unknown> => {
  return fetch(`${roots.Access}/admin/exit`, {
    method: 'POST',
    body: JSON.stringify({
      userId,
      accessToken,
      includeGuardian: true,
      dependantIds: [],
    }),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authId}`,
    },
  }).then(getData)
}
