import { FirebaseManager, firebaseAdmin } from "../../utils/firebase"
import { MagicLinkMail } from "../messaging/magiclink-service"

export class AuthService {
    private readonly firebaseAuth = FirebaseManager.getInstance().getAdmin().auth()

    async createUser(email: string) : Promise<string> {
        try {
            const user = await this.firebaseAuth.createUser({email: email})
            return user.uid
        }
        catch {
            const user = await this.firebaseAuth.getUserByEmail(email)
            return user.uid
        }
    }

    async sendEmailSignInLink(email: string, name: string) : Promise<void> {
        const signInLink = await this.firebaseAuth.generateSignInWithEmailLink(email, {
            url: "https://www.stayopn.com/DONE"
        })

        console.log(`Sending url: ${signInLink}`)

        const magiclinkMail = new MagicLinkMail({
            email: email,
            name: name,
            parameters: {
                link: signInLink
            }
        })
        magiclinkMail.send()
    }

    // TODO: verify a token
}
