import {Test, TestingModule} from '@nestjs/testing'
import {FirebaseAuthService} from './firebase-auth.service'

describe('TestServiceService', () => {
  let service: FirebaseAuthService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FirebaseAuthService],
    }).compile()

    service = module.get<FirebaseAuthService>(FirebaseAuthService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
