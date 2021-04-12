import {Test, TestingModule} from '@nestjs/testing'
import {OpnServicesController} from './opn-services.controller'
import {OpnServicesService} from './opn-services.service'

describe('OpnServicesController', () => {
  let opnServicesController: OpnServicesController

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [OpnServicesController],
      providers: [OpnServicesService],
    }).compile()

    opnServicesController = app.get<OpnServicesController>(OpnServicesController)
  })

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(opnServicesController.getHello()).toBe('Hello World!')
    })
  })
})
