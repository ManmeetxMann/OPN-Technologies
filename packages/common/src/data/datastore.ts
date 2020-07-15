import { FirebaseManager, firebaseAdmin } from "../utils/firebase"
import { FirestoreSimple } from "@firestore-simple/admin"

class DataStore
{
    // Static Constants Properties
    private static readonly rootPath = "/"

    // Properties
    private readonly firestore : firebaseAdmin.firestore.Firestore
    readonly firestoreORM : FirestoreSimple
    readonly firestoreAdmin = FirebaseManager.getInstance().getAdmin()

    constructor()
    {
        // Initialize Firestore
        this.firestore = this.firestoreAdmin.firestore()
        this.firestoreORM = new FirestoreSimple(this.firestore)
    }
}

export default DataStore