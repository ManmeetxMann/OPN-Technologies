import admin, {ServiceAccount, firestore} from 'firebase-admin'

import {FieldValue} from '@google-cloud/firestore'
import {Config} from './config'

export class FirebaseManager {
  // Properties
  private readonly firestore: admin.firestore.Firestore
  private readonly admin = admin
  private static __instance: FirebaseManager = null

  constructor() {
    // Needed when called from tests.. to ensure that we initialize it only once
    if (!this.admin.apps.length) {
      const serviceAccount = JSON.parse(Config.get('FIREBASE_ADMINSDK_SA')) as ServiceAccount
      this.admin.initializeApp({
        credential: this.admin.credential.cert(serviceAccount),
      })
    }
    // this.firestore = this.admin.firestore()
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

export {admin as firebaseAdmin}
export {firestore}
export {FieldValue}
