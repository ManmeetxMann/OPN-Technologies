import {Injectable} from '@nestjs/common'

@Injectable()
export class FirebaseAuthServiceMock {
  async createUser(email: string): Promise<string> {
    console.log('Create account with: ', email)
    return `TestUserAuthToken${Math.random()
      .toString(36)
      .substring(2, 15)}`
  }

  async updateUser(userId: string, properties: unknown): Promise<void> {
    console.log('userdata has been updated', userId, properties)
  }

  async getUserByEmail(email: string, exists = false): Promise<string> {
    if (exists) {
      return 'TestUserAuthToken'
    } else {
      return null
    }
  }
}
