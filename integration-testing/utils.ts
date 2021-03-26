import fetch from 'node-fetch'
import dotenv from 'dotenv'

import type {
  Organization,
  OrganizationGroup,
  OrganizationLocation,
} from '../packages/enterprise/src/models/organization'
import type {Passport} from '../packages/passport/src/models/passport'
import type {Access} from '../packages/access/src/models/access'
import type {User} from '../packages/common/src/data/user'

dotenv.config()
const {PUSH_TOKEN} = process.env

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
const get = (url: string, extraHeaders?: Record<string, string>) =>
  fetch(url, {
    method: 'GET',
    headers: {...headers, ...extraHeaders},
  })

export const setTime = async (services: Service[], milliseconds: number): Promise<void> => {
  await Promise.all(services.map((svc) => post(`${roots[svc]}/setTime`, {milliseconds})))
}

export const createOrg = async (name: string): Promise<Organization> =>
  post(`${roots.Enterprise}/organizations`, {
    name,
    allowDependants: true,
    dailyReminder: {
      enabled: false,
      enabledOnWeekends: false,
      timeOfDayMillis: 0,
    },
  }).then(getData)

export const createGroup = async (orgId: string, name: string): Promise<OrganizationGroup> =>
  post(`${roots.Enterprise}/organizations/${orgId}/groups`, [
    {
      name,
    },
  ])
    .then(getData)
    .then(([result]) => result)

export const createLocation = async (
  organizationId: string,
  title: string,
): Promise<OrganizationLocation> => {
  return post(`${roots.Enterprise}/organizations/${organizationId}/locations`, [
    {
      title,
      address: 'someAddress',
      attestationRequired: true,
      allowAccess: true,
      allowsSelfCheckInOut: true,
      city: 'Toronto',
      country: 'CA',
      state: 'ON',
      zip: 'MV5 1P1',
      type: 'default',
    },
  ])
    .then(getData)
    .then((data) => data.find((r: OrganizationLocation) => r.title === title))
}

export const createAdmin = async (
  firstName: string,
  lastName: string,
  email: string,
  locationIds: string[],
  organizationId: string,
  authUserId: string,
  groupId: string,
): Promise<User> => {
  await post(`${roots.Enterprise}/internal/admin/operations/create`, {
    email,
    locationIds,
    organizationId,
    superAdminForOrganizationIds: [],
    healthAdminForOrganizationIds: [organizationId],
    showReporting: true,
    groupIds: [groupId],
  })
  const user = await createUser(organizationId, firstName, lastName, groupId, PUSH_TOKEN)
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
  organizationId: string,
  firstName: string,
  lastName: string,
  groupId: string,
  token?: string,
): Promise<User> => {
  const reg = token ? await createRegistration(token) : null
  return post(`${roots.Enterprise}/user/connect/add`, {
    organizationId,
    groupId,
    firstName,
    lastName,
    base64Photo: 'www.google.com',
    registrationId: reg?.id ?? null,
  })
    .then(getData)
    .then((data) => data.user)
}

export const createRegistration = async (token: string): Promise<User> => {
  return post(`${roots.Registry}/user/add`, {
    platform: 'android',
    osVersion: 11,
    pushToken: token,
  }).then(getData)
}

export const createDependants = async (
  userId: string,
  dependants: {
    firstName: string
    lastName: string
  }[],
  organizationId: string,
): Promise<unknown[]> => {
  return post(`${roots.Registry}/v2/users/${userId}/dependants`, {
    dependants,
    organizationId,
  }).then(getData)
}

export const attest = async (
  userId: string,
  locationId: string,
  exposed: boolean,
  dependantIds: string[],
): Promise<Passport> => {
  return post(`${roots.Passport}/user/status/update`, {
    statusToken: '',
    userId,
    includeGuardian: true,
    dependantIds,
    locationId,
    answers: {
      '1': {'1': exposed},
      '2': {'1': false},
      '3': {'1': false},
      '4': {'1': false, '2': '2020-06-10T05:05:32.217Z'},
    },
  }).then(getData)
}

export const createAccess = async (
  userId: string,
  locationId: string,
  statusToken: string,
  dependantIds: string[],
  includeGuardian: boolean,
): Promise<Access> => {
  return post(`${roots.Access}/user/createToken`, {
    userId,
    statusToken,
    locationId,
    dependantIds,
    includeGuardian,
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
    },
    {
      Authorization: `Bearer ${authId}`,
    },
  ).then(getData)
}

export const getStats = async (organizationId: string, authId: string): Promise<unknown> => {
  return get(`${roots.Enterprise}/organizations/${organizationId}/stats`, {
    Authorization: `Bearer ${authId}`,
  }).then(getData)
}
