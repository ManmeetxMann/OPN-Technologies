import {FirestoreSimpleMock, FieldPath, FieldValue, Timestamp} from './firestore-simple-admin'

const users = [
  {
    uid: 'sep',
    email: 'sep@stayopn.com',
    emailVerified: true,
    name: 'Sep Seyedi',
    displayName: 'Sep Seyedi',
    photoURL: 'www.google.com',
  },
]

const mockMessaging = (): unknown => ({
  send: async () => null,
})

mockMessaging.Message = class Message {}
export const mockFirestore = (): unknown => ({
  collection: (path: string) => new FirestoreSimpleMock().collection({path}),
})
mockFirestore.FieldValue = FieldValue
mockFirestore.FieldPath = FieldPath
mockFirestore.Timestamp = Timestamp

const admin = {
  apps: [],
  messaging: mockMessaging,
  initializeApp: (app: unknown): void => {
    admin.apps.push(app)
  },
  credential: {
    cert: (): null => null,
  },
  firestore: mockFirestore,
  auth: (): unknown => ({
    createUser: async ({email}: {email: string}): Promise<unknown> => {
      if (users.some((u) => u.email === email)) {
        throw new Error('Email in use')
      }
      const user = {
        email,
        uid: email,
        emailVerified: true,
        name: email,
        displayname: email,
      }
      return user
    },
    getUserByEmail: async ({email}: {email: string}): Promise<unknown> => {
      return users.find((u) => u.email === email)
    },
    updateUser: async (uid: string, properties: Record<string, unknown>): Promise<void> => {
      const user = users.find((u) => u.uid === uid)
      Object.keys(properties)
        .filter((k) => k !== 'uid')
        .forEach((k) => (user[k] = properties[k]))
    },
    getUser: async (uid: string): Promise<unknown> => {
      return users.find((u) => u.uid === uid)
    },
    generateSignInWithEmailLink: async (email: string): Promise<string> => {
      return email
    },
    // fake IdTokens are just uids
    verifyIdToken: async (token: string): Promise<unknown> => {
      return users.find((u) => u.uid === token)
    },
    // no op
    setCustomUserClaims: async (token: string): Promise<unknown> => {
      return users.find((u) => u.uid === token)
    },
  }),
}

export default admin
