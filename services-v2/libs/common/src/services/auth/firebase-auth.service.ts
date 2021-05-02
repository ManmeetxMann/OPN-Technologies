import {Injectable} from '@nestjs/common'

// Services
import {FirebaseManager} from '@opn-services/common/services/firebase/firebase.service'

export interface AuthUser {
  uid: string
  email?: string
  phoneNumber?: string
  emailVerified: boolean
  customClaims?: Record<string, unknown>
}

/**
 * Authorization Service
 * Note: one approval PER admin email
 */
@Injectable()
export class FirebaseAuthService {
  // constructor(configService: ConfigService) {}

  private readonly firebaseAuth = FirebaseManager.getInstance()
    .getAdmin()
    .auth()

  async createUser(email: string): Promise<string> {
    try {
      const user = await this.firebaseAuth.createUser({email: email})
      return user.uid
    } catch {
      const user = await this.firebaseAuth.getUserByEmail(email)
      return user.uid
    }
  }

  async updateUser(userId: string, properties: unknown): Promise<void> {
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

  // async sendEmailSignInLink(info: {email: string; name?: string}): Promise<void> {
  //   // Setup action
  //   const actionCodeSettings = {
  //     url: this.configService.get('AUTH_EMAIL_SIGNIN_LINK'),
  //     handleCodeInApp: true,
  //     iOS: {
  //       bundleId: this.configService.get('AUTH_EMAIL_SIGNIN_IOS'),
  //     },
  //     android: {
  //       packageName: this.configService.get('AUTH_EMAIL_SIGNIN_ANDROID'),
  //       installApp: true,
  //     },
  //     // FDL custom domain.
  //     dynamicLinkDomain: this.configService.get('AUTH_EMAIL_SIGNIN_DOMAIN'),
  //   }

  //   const signInLink = await this.firebaseAuth.generateSignInWithEmailLink(
  //     info.email,
  //     actionCodeSettings,
  //   )

  //   console.log(`Sending url: ${signInLink}`)

  //   const magiclinkMail = new MagicLinkMail({
  //     email: info.email,
  //     name: info.name,
  //     parameters: {
  //       link: signInLink,
  //     },
  //   })
  //   magiclinkMail.send()
  // }

  async verifyAuthToken(authToken: string): Promise<AuthUser> {
    try {
      const decodedToken = await this.firebaseAuth.verifyIdToken(authToken, true)
      if (decodedToken !== undefined) {
        return {
          uid: decodedToken.uid,
          email: decodedToken.email,
          phoneNumber: decodedToken.phone_number,
          emailVerified: decodedToken.email_verified ?? false,
        }
      }
    } catch (error) {
      return null
    }
    return null
  }

  // async setClaims(authUserId: string, claims: Record<string, unknown>): Promise<void> {
  //   // await this.firebaseAuth.setCustomUserClaims(authUserId, claims)
  // }
}
