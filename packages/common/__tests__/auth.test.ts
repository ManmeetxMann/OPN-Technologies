import {AuthService} from '../src/service/auth/auth-service'

describe('auth tests', () => {
  test('auth user creation', async (done) => {
    const authService = new AuthService()
    const userCreated = await authService.createUser('testo2@i239.co')
    expect(userCreated)
    done()
  })

  test('auth email login sending', async (done) => {
    const authService = new AuthService()
    const userCreated = await authService.sendEmailSignInLink({
      email: 'testo1@i239.co',
      name: 'Sep Seyedi',
    })
    expect(userCreated)
    done()
  })
})
