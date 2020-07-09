import * as express from 'express'
import {Request, Response} from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import DataStore from '../../../common/src/data/datastore'
import {RegistrationModel} from '../../../common/src/data/registration'
import {RegistrationType} from '../../../common/src/schemas/registration'
import {actionSucceed} from '../../../common/src/utils/response-wrapper'
import {MessagingFactory} from '../../../common/src/service/messaging/messaging-service'

class UserController implements IControllerBase {
  public path = '/user'
  public router = express.Router()
  private dataStore = new DataStore()
  private messaging = MessagingFactory.getDefault()

  constructor() {
    this.initRoutes()
  }

  public initRoutes() {
    this.router.post(this.path + '/add', this.add)
    this.router.post(this.path + '/addNoPush', this.addNoPush)
  }

  add = async (req: Request, res: Response): Promise<void> => {
    // Check token
    const token = req.body.registrationToken
    await this.messaging.validatePushToken(token)

    // Save token
    const registration = new RegistrationModel(this.dataStore)
    await registration.add({
      type: RegistrationType.User,
      pushToken: req.body.registrationToken,
    })

    res.json(actionSucceed())
  }

  addNoPush = (req: Request, res: Response) => {
    const response = {
      status: 'complete',
    }

    res.json(response)
  }
}

export default UserController
