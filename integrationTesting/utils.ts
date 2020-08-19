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

const setTime = async (services: Service[], milliseconds: number): Promise<void> => {
  await Promise.all(
    services.map((svc) =>
      fetch(`${roots[svc]}/setTIme`, {
        method: 'POST',
        body: JSON.stringify({milliseconds}),
      }),
    ),
  )
}

const createOrg = async (name: string): Promise<unknown> => {
  return fetch(`${roots.Enterprise}/organizations`, {
    method: 'POST',
    body: JSON.stringify({name}),
    headers: {'Content-Type': 'application/json'},
  })
    .then((r) => r.json())
    .then(({data}) => data)
}

const createLoc = async (organizationId, title: string): Promise<unknown> => {
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
    .then((r) => r.json())
    .then(({data}) => data[0])
}

createOrg('someOrg')
  .then((x) => {
    console.log(x)
    // @ts-ignore
    return createLoc(x.id, 'swimming pool')
  })
  .then((loc) => console.log(loc))
