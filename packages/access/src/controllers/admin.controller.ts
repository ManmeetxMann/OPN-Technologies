import * as express from 'express'
import {NextFunction, Request, Response} from 'express'
import IRouteController from '../../../common/src/interfaces/IRouteController.interface'
import {PassportService} from '../../../passport/src/services/passport-service'
import {AccessService} from '../service/access.service'
import {actionFailed, actionSucceed} from '../../../common/src/utils/response-wrapper'
import {PassportStatuses} from '../../../passport/src/models/passport'
import {isPassed} from '../../../common/src/utils/datetime-util'
import {UserService} from '../../../common/src/service/user/user-service'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {authMiddleware} from '../../../common/src/middlewares/auth'

class AdminController implements IRouteController {
  public router = express.Router()
  private passportService = new PassportService()
  private accessService = new AccessService()
  private userService = new UserService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const routes = express
      .Router()
      .post('/stats', authMiddleware, this.stats)
      .post('/enter', authMiddleware, this.enter)
      .post('/exit', authMiddleware, this.exit)
    this.router.use('/admin', routes)
  }

  stats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {locationId: locationIdOrPath} = req.body
      // handle (temporarily) `organizations/{orgId}/locations/{locationId}` as the `locationId`
      const paths = locationIdOrPath.split('/')
      const locationId = paths.length > 0 ? paths[paths.length - 1] : locationIdOrPath
      const {peopleOnPremises, accessDenied} = await this.accessService.getTodayStatsForLocation(
        locationId,
      )

      res.json(actionSucceed({peopleOnPremises, accessDenied}))
    } catch (error) {
      next(error)
    }
  }

  enter = async (req: Request, res: Response, next: NextFunction): Promise<unknown> => {
    try {
      const {accessToken, userId} = req.body
      const access = await this.accessService.findOneByToken(accessToken)
      const passport = await this.passportService.findOneByToken(access.statusToken)
      const user = await this.userService.findOne(userId)
      if (!user) {
        throw new ResourceNotFoundException(`Cannot find user with ID [${userId}]`)
      }

      if (!access.userId) {
        // old records might not have these fields
        console.debug(`dynamically assigning ${userId} to access ${access.id}`)
        access.userId = userId
      } else if (userId !== access.userId) {
        console.warn(`client calims ${userId} but access has ${access.userId}`)
      }

      const responseBody = {passport, base64Photo: user.base64Photo}
      const canEnter =
        passport.status === PassportStatuses.Pending ||
        (passport.status === PassportStatuses.Proceed && !isPassed(passport.validUntil))

      if (canEnter) {
        await this.accessService.handleEnter(access)
        return res.json(actionSucceed(responseBody))
      }

      res.status(400).json(actionFailed('Access denied for access-token', responseBody))
    } catch (error) {
      next(error)
    }
  }

  exit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {accessToken, userId} = req.body
      const access = await this.accessService.findOneByToken(accessToken)
      const passport = await this.passportService.findOneByToken(access.statusToken)
      const user = await this.userService.findOne(userId)
      if (!user) {
        throw new ResourceNotFoundException(`Cannot find user with ID [${userId}]`)
      }
      if (!access.userId) {
        // old records might not have these fields
        console.debug(`dynamically assigning ${userId} to access ${access.id}`)
        access.userId = userId
      } else if (userId !== access.userId) {
        console.warn(`client calims ${userId} but access has ${access.userId}`)
      }
      await this.accessService.handleExit(access)

      res.json(actionSucceed({passport, base64Photo: user.base64Photo}))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminController
