import admin, { ServiceAccount } from "firebase-admin"
import serviceAccount from "../../__secrets__/opn-platform-dev-firebase-adminsdk.json"
import { FirestoreSimple } from "@firestore-simple/admin"
import { HasId } from "@firestore-simple/admin/dist/types"

class DataStore
{
    // Static Constants Properties
    private static readonly rootPath = "/"

    // Properties
    private readonly firestore : admin.firestore.Firestore
    readonly firestoreSimple : FirestoreSimple

    constructor()
    {
        // Initialize Firestore
        
        // Needed when called from tests.. to ensure that we initialize it only once
        if (!admin.apps.length)
        {
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount as ServiceAccount) })
        }
        this.firestore = admin.firestore()
        this.firestoreSimple = new FirestoreSimple(this.firestore)
    }
}

export default DataStore