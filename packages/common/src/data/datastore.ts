import admin, {ServiceAccount} from 'firebase-admin'
import serviceAccount from '../../__secrets__/opn-platform-dev-firebase-adminsdk.json'
import {FirestoreSimple} from '@firestore-simple/admin'

class DataStore {
  // Static Constants Properties
  private static readonly rootPath = '/'

  // Properties
  private readonly firestore: admin.firestore.Firestore
  readonly firestoreORM: FirestoreSimple
  readonly firestoreAdmin = admin

  constructor() {
    // Initialize Firestore

    // Needed when called from tests.. to ensure that we initialize it only once
    if (!this.firestoreAdmin.apps.length) {
      this.firestoreAdmin.initializeApp({
        credential: this.firestoreAdmin.credential.cert(serviceAccount as ServiceAccount),
      })
    }
    this.firestore = this.firestoreAdmin.firestore()
    this.firestoreORM = new FirestoreSimple(this.firestore)
  }
}

export default DataStore
