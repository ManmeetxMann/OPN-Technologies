import {Injectable} from '@nestjs/common'

// Services
import {FirebaseManager} from './firebase.service'

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
}
