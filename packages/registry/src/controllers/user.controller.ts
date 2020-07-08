import * as express from 'express'
import {Request, Response} from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'

import DataStore from '../../../common/src/data/datastore'
import {RegistrationModel} from '../../../common/src/data/registration'
import {RegistrationType} from '../../../common/src/schemas/registration'

class UserController implements IControllerBase {
  public path = '/user'
  public router = express.Router()

  constructor() {
    this.initRoutes()
  }

  public initRoutes() {
    this.router.post(this.path + '/add', this.add)
    this.router.post(this.path + '/addNoPush', this.addNoPush)
  }

  add = async (req: Request, res: Response): Promise<void> => {
    // Create DataStore
    const datastore = new DataStore()

    // Create
    const registration = new RegistrationModel(datastore)
    await registration.add({
      type: RegistrationType.User,
      pushToken: req.body.registrationToken,
    })

    res.json({
      status: 'complete',
    })
  }

  addNoPush = (req: Request, res: Response) => {
    const response = {
      status: 'complete',
    }

    res.json(response)
  }
}

export default UserController
