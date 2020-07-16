import { FirebaseManager, firebaseAdmin } from "../../utils/firebase"
import { MagicLinkMail } from "../messaging/magiclink-service"

export interface AuthUser {
    uid: string
    email?: string;
}

/**
 * Authorization Service
 * Note: one approval PER admin email
 */
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

    async updateUser(userId: string, properties: any) : Promise<void> {
        await this.firebaseAuth.updateUser(userId, properties)
    }

    async getUserEmail(userId: string) : Promise<string> {
        const userRecord = await this.firebaseAuth.getUser(userId)
        return userRecord.email
    }

    async sendEmailSignInLink(info: {email: string, name?: string}) : Promise<void> {
        const signInLink = await this.firebaseAuth.generateSignInWithEmailLink(info.email, {
            url: "https://www.stayopn.com/DONE"
        })

        console.log(`Sending url: ${signInLink}`)

        const magiclinkMail = new MagicLinkMail({
            email: info.email,
            name: info.name,
            parameters: {
                link: signInLink
            }
        })
        magiclinkMail.send()
    }

    async verifyAuthToken(authToken: string) : Promise<AuthUser> {
        try {
            const decodedToken = await this.firebaseAuth.verifyIdToken(authToken, true)
            if (decodedToken !== undefined) {
                return decodedToken as AuthUser
            }
        } catch (error) {
        }
        
        return null
    }
}
