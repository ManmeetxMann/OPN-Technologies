import {Router} from 'express'
import IControllerBase from './IControllerBase.interface'
export interface IRouteController extends IControllerBase {
  router: Router
}

export default IRouteController
