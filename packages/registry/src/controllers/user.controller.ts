import * as express from 'express'
import {Request, Response} from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import admin from 'firebase-admin'
import DataStore from '../../../common/src/data/datastore'
import {RegistrationModel} from '../../../common/src/data/registration'
import {RegistrationType} from '../../../common/src/schemas/registration'
import {FirebaseError, FirebaseMessagingErrors} from '../../../common/src/types/firebase'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {HttpException} from '../../../common/src/exceptions/httpexception'
import {actionSucceed} from '../../../common/src/utils/response-wrapper'

class UserController implements IControllerBase {
  public path = '/user'
  public router = express.Router()
  private dataStore = new DataStore()

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
    await admin
      .messaging()
      .send({token}, true)
      .catch((error: FirebaseError) => {
        console.log(`Something went wrong when validating token [${token}];`, error)
        if (
          error.code === FirebaseMessagingErrors.InvalidArgument ||
          error.code === FirebaseMessagingErrors.Unregistered
        ) {
          throw new BadRequestException(`Invalid token: ${error.message}`)
        }
        throw new HttpException()
      })

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
