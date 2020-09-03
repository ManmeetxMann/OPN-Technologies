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

type NodeResponse = {
  json: () => Promise<{
    data: unknown
  }>
}

const getData = (response: NodeResponse) => response.json().then(({data}) => data)

const headers = {'Content-Type': 'application/json'}
const post = (url: string, body: unknown, extraHeaders?: Record<string, string>) =>
  fetch(url, {
    method: 'POST',
    headers: {...headers, ...extraHeaders},
    body: JSON.stringify(body),
  })

export const setTime = async (services: Service[], milliseconds: number): Promise<void> => {
  await Promise.all(services.map((svc) => post(`${roots[svc]}/setTime`, {milliseconds})))
}

export const createOrg = async (name: string): Promise<Organization> =>
  post(`${roots.Enterprise}/organizations`, {name}).then(getData)

export const createLocation = async (
  organizationId: string,
  title: string,
): Promise<OrganizationLocation> => {
  return post(`${roots.Enterprise}/organizations/${organizationId}/locations`, [
    {
      title,
      address: 'someAddress',
      attestationRequired: true,
      city: 'Toronto',
      country: 'CA',
      state: 'ON',
      zip: 'MV5 1P1',
    },
  ])
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
  await post(`${roots.Enterprise}/internal/adminApproval/create`, {
    email,
    locationIds,
    organizationId,
  })
  const user = await createUser(key, firstName, lastNameInitial)
  await post(`${roots.Enterprise}/admin/auth/signIn/request`, {
    email,
    // @ts-ignore
    connectedId: user.id,
  })
  await post(`${roots.Enterprise}/admin/auth/signIn/process`, {
    idToken: `${authUserId}///${email}`,
    // @ts-ignore
    connectedId: user.id,
  })
  return user
}

export const createUser = async (
  key: number,
  firstName: string,
  lastNameInitial: string,
): Promise<User> => {
  return post(`${roots.Enterprise}/user/connect/add`, {
    key,
    firstName,
    lastNameInitial,
    birthYear: 1999,
    base64Photo: 'www.google.com',
  })
    .then(getData)
    .then((data) => data.user)
}

export const attest = async (
  userId: string,
  locationId: string,
  exposed: boolean,
): Promise<Passport> => {
  return post(`${roots.Passport}/user/status/update`, {
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
  }).then(getData)
}

export const createAccess = async (
  userId: string,
  locationId: string,
  statusToken: string,
): Promise<Access> => {
  return post(`${roots.Access}/user/createToken`, {
    userId,
    statusToken,
    locationId,
    dependantIds: [],
    includeGuardian: true,
  }).then(getData)
}

export const scanEntry = async (
  userId: string,
  accessToken: string,
  authId: string,
): Promise<unknown> => {
  return post(
    `${roots.Access}/admin/enter`,
    {
      userId,
      accessToken,
    },
    {
      Authorization: `Bearer ${authId}`,
    },
  ).then(getData)
}

export const scanExit = async (
  userId: string,
  accessToken: string,
  authId: string,
): Promise<unknown> => {
  return post(
    `${roots.Access}/admin/exit`,
    {
      userId,
      accessToken,
      includeGuardian: true,
      dependantIds: [],
    },
    {
      Authorization: `Bearer ${authId}`,
    },
  ).then(getData)
}
