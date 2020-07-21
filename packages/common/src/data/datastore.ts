import { FirebaseManager, firebaseAdmin } from "../utils/firebase"
import { FirestoreSimple } from "@firestore-simple/admin"

class DataStore
{
    // Static Constants Properties
    private static readonly rootPath = "/"

    // Properties
    readonly firestoreORM : FirestoreSimple
    readonly firestoreAdmin = FirebaseManager.getInstance().getAdmin()
    private readonly firestore : firebaseAdmin.firestore.Firestore

    constructor()
    {
        // Initialize Firestore
        this.firestore = this.firestoreAdmin.firestore()
        this.firestoreORM = new FirestoreSimple(this.firestore)
    }
}

export default DataStore