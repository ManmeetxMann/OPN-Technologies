import { FirebaseManager, firebaseAdmin } from "../../utils/firebase"

export class AuthService {
    private readonly firebaseAuth = FirebaseManager.getInstance().getAdmin().auth()

    async createUser(email: string) : Promise<boolean> {
        try {
            const user = await this.firebaseAuth.createUser({email: email})
            console.log(user.uid)
            return true
        }
        catch {
            return false
        }
    }

    async sendEmailSignInLink(email:string) : Promise<void> {
        const signInLink = await this.firebaseAuth.generateSignInWithEmailLink(email, {
            url: "https://www.stayopn.com/DONE"
        })

        console.log(`Sending url: ${signInLink}`)
    }

    // TODO: verify a token
}
