import admin, {ServiceAccount} from 'firebase-admin'
import {FieldValue} from '@google-cloud/firestore'

// Load up environment vars
import dotenv from 'dotenv'
import path from 'path'
dotenv.config({path: path.resolve(__dirname, '../../.env')})


export class FirebaseManager {
  // Properties
  private readonly firestore: admin.firestore.Firestore
  private readonly admin = admin
  private static __instance: FirebaseManager = null

  constructor() {
    // Needed when called from tests.. to ensure that we initialize it only once
    if (!this.admin.apps.length) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_ADMINSDK_SA) as ServiceAccount
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
export {FieldValue}
