import admin, {ServiceAccount} from 'firebase-admin'
import serviceAccount from '../../__secrets__/opn-platform-dev-firebase-adminsdk.json'

export class FirebaseManager {
  // Properties
  private readonly firestore: admin.firestore.Firestore
  private readonly admin = admin
  private static __instance: FirebaseManager = null

  constructor() {
    // Needed when called from tests.. to ensure that we initialize it only once
    if (!this.admin.apps.length) {
      this.admin.initializeApp({
        credential: this.admin.credential.cert(serviceAccount as ServiceAccount),
      })
    }
    // this.firestore = this.admin.firestore()
  }

  getAdmin() {
    return this.admin
  }

  static getInstance() {
    if (FirebaseManager.__instance === null) {
      FirebaseManager.__instance = new FirebaseManager()
    }
    return FirebaseManager.__instance
  }
}

export {admin as firebaseAdmin}
