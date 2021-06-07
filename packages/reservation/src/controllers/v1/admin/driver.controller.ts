import {NextFunction, Request, Response, Router} from 'express'
import IControllerBase from "../../../../../common/src/interfaces/IControllerBase.interface";
import { authorizationMiddleware } from '../../../../../common/src/middlewares/authorization';
import { RequiredUserPermission } from '../../../../../common/src/types/authorization';
import { getUserId } from '../../../../..//common/src/utils/auth';
import { actionSucceed, actionSuccess } from '../../../../../common/src/utils/response-wrapper';
import { DriverService } from '../../../services/driver.service';
import { Driver } from '../../../models/driver'


export default class AdminDriverController implements IControllerBase {
  public path = '/reservation/admin'
  public router = Router()
  public driverService = new DriverService()

  constructor() {
    this.initRoutes()
  }

  initRoutes(): void {
    const innerRouter = Router({mergeParams: true})

    innerRouter.post(
      this.path + '/api/v1/drivers',
      authorizationMiddleware([RequiredUserPermission.OPNAdmin]),
      this.addDriver
    )


    innerRouter.put(
      this.path + '/api/v1/drivers',
      authorizationMiddleware([RequiredUserPermission.OPNAdmin]),
      this.updateDriver
    )


    innerRouter.get(
      this.path + '/api/v1/drivers',
      authorizationMiddleware([RequiredUserPermission.OPNAdmin]),
      this.getDrivers
    )

    this.router.use('/', innerRouter)
  }

  addDriver = async(req: Request, res: Response, next:NextFunction): Promise<void> => {
    try {
      const driverData = {
        name: (req.body as { name: string }).name,
        enabled: true,
        adminId: getUserId(res.locals.authenticatedUser)
      }

      const driverId = (await this.driverService.save(driverData as Driver)).id
      res.json(actionSuccess({id: driverId}, 'Driver created'))
    } catch(e) {
      next(e)
    }
  }


  updateDriver = async(req: Request, res: Response, next:NextFunction): Promise<void> => {
    try {
      const {name, enabled} = req.body as {name: string, enabled: boolean}
      const updatedId = (await this.driverService.update(name, enabled)).id
      res.json(actionSuccess({id: updatedId}, 'Driver updated'))
    } catch(e) {
      next(e)
    }
  }


  getDrivers = async(req: Request, res: Response, next:NextFunction): Promise<void> => {
    try {
      // const driversResList = (await this.driverService.getAll()).map(driver => driver.name)
      const driversResList = (await this.driverService.getAllEnabled()).map(driver => driver.name)
      res.json(actionSucceed(driversResList))
    } catch(e) {
      next(e)
    }
  }
}