import * as express from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'

class AdminController implements IControllerBase {
  public path = '/admin'
  public router = express.Router()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    // this.router.get(this.path + '/check', this.check)
  }
}

export default AdminController
