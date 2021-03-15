import {FirebaseManager} from '../../utils/firebase'
import {MagicLinkMail} from '../messaging/magiclink-service'
import {Config} from '../../utils/config'

export interface AuthUser {
  uid: string
  email?: string
  emailVerified: boolean
  customClaims?: Record<string, unknown>
}

/**
 * Authorization Service
 * Note: one approval PER admin email
 */
export class AuthService {
  private readonly firebaseAuth = FirebaseManager.getInstance().getAdmin().auth()

  async createUser(email: string): Promise<string> {
    if (Config.get('DEBUG_GUILIBLE_MODE') === 'enabled') {
      if (Config.get('FIRESTORE_EMULATOR_HOST') !== 'localhost:8080') {
        console.error('Running in guilible mode, but not pointed to an emulated server')
        // IGNORE THIS MODE
      } else {
        // TODO: if we ever read the return of this, we need to work around this one
        return email
      }
    }
    try {
      const user = await this.firebaseAuth.createUser({email: email})
      return user.uid
    } catch {
      const user = await this.firebaseAuth.getUserByEmail(email)
      return user.uid
    }
  }

  async updateUser(userId: string, properties: unknown): Promise<void> {
    if (Config.get('DEBUG_GUILIBLE_MODE') === 'enabled') {
      if (Config.get('FIRESTORE_EMULATOR_HOST') !== 'localhost:8080') {
        console.error('Running in guilible mode, but not pointed to an emulated server')
        // IGNORE THIS MODE
      } else {
        return
      }
    }
    await this.firebaseAuth.updateUser(userId, properties)
  }

  async getUserByEmail(email: string): Promise<string> {
    try {
      const user = await this.firebaseAuth.getUserByEmail(email)

      return user.uid
    } catch (error) {
      return null
    }
  }

  async getUserEmail(userId: string): Promise<string> {
    const userRecord = await this.firebaseAuth.getUser(userId)
    return userRecord.email
  }

  async sendEmailSignInLink(info: {email: string; name?: string}): Promise<void> {
    if (Config.get('DEBUG_GUILIBLE_MODE') === 'enabled') {
      if (Config.get('FIRESTORE_EMULATOR_HOST') !== 'localhost:8080') {
        console.error('Running in guilible mode, but not pointed to an emulated server')
        // IGNORE THIS MODE
      } else {
        return
      }
    }
    // Setup action
    const actionCodeSettings = {
      url: Config.get('AUTH_EMAIL_SIGNIN_LINK'),
      handleCodeInApp: true,
      iOS: {
        bundleId: Config.get('AUTH_EMAIL_SIGNIN_IOS'),
      },
      android: {
        packageName: Config.get('AUTH_EMAIL_SIGNIN_ANDROID'),
        installApp: true,
      },
      // FDL custom domain.
      dynamicLinkDomain: Config.get('AUTH_EMAIL_SIGNIN_DOMAIN'),
    }

    const signInLink = await this.firebaseAuth.generateSignInWithEmailLink(
      info.email,
      actionCodeSettings,
    )

    console.log(`Sending url: ${signInLink}`)

    const magiclinkMail = new MagicLinkMail({
      email: info.email,
      name: info.name,
      parameters: {
        link: signInLink,
      },
    })
    magiclinkMail.send()
  }

  async verifyAuthToken(authToken: string): Promise<AuthUser> {
    try {
      const decodedToken = await this.firebaseAuth.verifyIdToken(authToken, true)
      if (decodedToken !== undefined) {
        return {
          uid: decodedToken.uid,
          email: decodedToken.email,
          emailVerified: decodedToken.email_verified ?? false,
        }
      }
    } catch (error) {
      // TODO: -- TO BE REMOVED -- to avoid security flaw when deploying with wrong environment variable
      // If an error occurred we shouldn't ignore it, no matter what is the running database engine.
      // Moreover, this security layer shouldn't even care about the firestore-emulator.
      // There's no point to add security if we add logic to workaround it, especially if that logic is everywhere.
      // The emulator should be seeded or configured to run against the security layer, not the opposite.
      // ---
      // take the client's word that they are who they say they are
      if (Config.get('DEBUG_GUILIBLE_MODE') === 'enabled') {
        if (Config.get('FIRESTORE_EMULATOR_HOST') !== 'localhost:8080') {
          console.error('Running in guilible mode, but not pointed to an emulated server')
          throw error
        }
        const [uid, email] = authToken.split('///')
        return {
          uid,
          email,
          emailVerified: true,
        }
      }
      // TODO: -- END TO BE REMOVED --
    }

    return null
  }

  async setClaims(authUserId: string, claims: Record<string, unknown>): Promise<void> {
    await this.firebaseAuth.setCustomUserClaims(authUserId, claims)
  }
}
