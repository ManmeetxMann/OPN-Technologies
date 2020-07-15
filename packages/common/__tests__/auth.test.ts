import {AuthService} from '../src/service/auth/auth-service'
import { doesNotMatch } from 'assert';

describe("auth tests", () => {
    test("auth user creation", async (done) => {
        const authService = new AuthService()
        const userCreated = await authService.createUser("sep@stayopn.com")
        expect(userCreated)
        done()
    });

    test("auth email login sending", async (done) => {
        const authService = new AuthService()
        const userCreated = await authService.sendEmailSignInLink("sep@stayopn.com", "Sep Seyedi")
        expect(userCreated)
        done()
    });
});