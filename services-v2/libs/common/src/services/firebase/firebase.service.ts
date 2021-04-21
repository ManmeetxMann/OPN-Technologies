// NestJs
import {ConfigService} from '@nestjs/config'

// Libs
import admin, {ServiceAccount} from 'firebase-admin'
import {FieldValue} from '@google-cloud/firestore'
import {FirestoreSimple} from '@firestore-simple/admin'

// Services
// import {Config} from './config'

const configService = new ConfigService()

/**
 * Singleton
 */
class FirebaseManager {
  // Properties
  private readonly firestore: admin.firestore.Firestore
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

class DataStore {
  // Static Constants Properties
  private static readonly rootPath = '/'

  // Properties
  readonly firestoreORM: FirestoreSimple
  readonly firestoreAdmin = FirebaseManager.getInstance().getAdmin()
  private readonly firestore: admin.firestore.Firestore

  constructor() {
    // Initialize Firestore
    this.firestore = this.firestoreAdmin.firestore()
    this.firestoreORM = new FirestoreSimple(this.firestore)
  }
}

export {FirebaseManager, DataStore}
