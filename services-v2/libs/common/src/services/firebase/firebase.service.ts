// NestJs
import {ConfigService} from '@nestjs/config'

// Libs
import admin, {ServiceAccount} from 'firebase-admin'
import {FieldValue} from '@google-cloud/firestore'

// Services
// import {Config} from './config'

const configService = new ConfigService()

/**
 * Singleton
 */
export class FirebaseService {
  // Properties
  private readonly firestore: admin.firestore.Firestore
  private readonly admin = admin
  private static __instance: FirebaseService = null

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

  static getInstance(): FirebaseService {
    if (FirebaseService.__instance === null) {
      FirebaseService.__instance = new FirebaseService()
    }
    return FirebaseService.__instance
  }
}

export {admin as firebaseAdmin}
