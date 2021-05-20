// NestJs
// eslint-disable-next-line no-restricted-imports
import {ConfigService} from '@nestjs/config'
import {OpnConfigService} from '../../services'

// Libs
import admin, {ServiceAccount} from 'firebase-admin'
import {FieldValue} from '@google-cloud/firestore'

// Services
// import {Config} from './config'

const baseConfigService = new ConfigService()
const configService = new OpnConfigService(baseConfigService)

/**
 * Singleton
 */
class FirebaseManager {
  // Properties
  private readonly admin = admin
  private static __instance: FirebaseManager = null

  constructor() {
    // Needed when called from tests.. to ensure that we initialize it only once
    if (!this.admin.apps.length) {
      const serviceAccount = JSON.parse(configService.get('FIREBASE_ADMINSDK_SA')) as ServiceAccount
      this.admin.initializeApp({
        credential: this.admin.credential.cert(serviceAccount),
      })
    }
  }

  getAdmin(): typeof admin {
    return this.admin
  }

  getFirestoreDeleteField(): FieldValue {
    return this.getAdmin().firestore.FieldValue.delete()
  }

  static getInstance(): FirebaseManager {
    if (FirebaseManager.__instance === null) {
      FirebaseManager.__instance = new FirebaseManager()
    }
    return FirebaseManager.__instance
  }
}

export {FirebaseManager}
