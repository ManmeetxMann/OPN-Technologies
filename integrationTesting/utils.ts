import fetch from 'node-fetch'

type Service = 'Config' | 'Access' | 'Enterprise' | 'Lookup' | 'Passport' | 'Registry'

const roots = {
  Config: 'http://localhost:5001',
  Access: 'http://localhost:5002',
  Enterprise: 'http://localhost:5003',
  Lookup: 'http://localhost:5004',
  Passport: 'http://localhost:5005',
  Registry: 'http://localhost:5006',
}

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

export const createOrg = async (name: string): Promise<any> => {
  return fetch(`${roots.Enterprise}/organizations`, {
    method: 'POST',
    body: JSON.stringify({name}),
    headers: {'Content-Type': 'application/json'},
  })
    .then((r) => r.json())
    .then(({data}) => data)
}

export const createLoc = async (organizationId, title: string): Promise<any> => {
  return (
    fetch(`${roots.Enterprise}/organizations/${organizationId}/locations`, {
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
      .then((r) => r.json())
      // .then((r) => {
      //   console.log(r)
      //   return r
      // })
      .then(({data}) => data.find((r) => r.title === title))
  )
}

export const createAdmin = async (
  key: number,
  firstName: string,
  lastNameInitial: string,
  email: string,
  locationId: string,
  organizationId: string,
  authUserId: string,
): Promise<any> => {
  await fetch(`${roots.Enterprise}/internal/adminApproval/create`, {
    method: 'POST',
    body: JSON.stringify({
      email,
      locationId,
      organizationId,
    }),
    headers: {'Content-Type': 'application/json'},
  })
    .then((r) => r.json())
    .then(({data}) => data)
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
    .then((r) => r.json())
    .then(({data}) => data)
  await fetch(`${roots.Enterprise}/admin/auth/signIn/process`, {
    method: 'POST',
    body: JSON.stringify({
      idToken: `${authUserId}///${email}`,
      // @ts-ignore
      connectedId: user.id,
    }),
    headers: {'Content-Type': 'application/json'},
  })
    .then((r) => r.json())
    .then(({data}) => data)
  return user
}

export const createUser = async (
  key: number,
  firstName: string,
  lastNameInitial: string,
): Promise<any> => {
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
    .then((r) => r.json())
    .then(({data}) => data.user)
}

export const attest = async (
  userId: string,
  locationId: string,
  exposed: boolean,
): Promise<any> => {
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
  })
    .then((r) => r.json())
    .then(({data}) => data)
}

export const createAccess = async (
  userId: string,
  locationId: string,
  statusToken: string,
): Promise<any> => {
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
  })
    .then((r) => r.json())
    .then(({data}) => data)
}

export const scanEntry = async (
  userId: string,
  accessToken: string,
  authId: string,
): Promise<any> => {
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
  })
    .then((r) => r.json())
    .then(({data}) => data)
}

export const scanExit = async (
  userId: string,
  accessToken: string,
  authId: string,
): Promise<any> => {
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
  })
    .then((r) => r.json())
    .then(({data}) => data)
}
