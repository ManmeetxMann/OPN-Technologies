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
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {UnauthorizedException} from '../../../common/src/exceptions/unauthorized-exception'
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
      if (userId !== access.userId) {
        // TODO: we could remove userId from this request
        throw new UnauthorizedException(`Access ${accessToken} does not belong to ${userId}`)
      }
      const responseBody = {
        passport,
        base64Photo: user.base64Photo,
        dependants: [],
        includesGuardian: access.includesGuardian,
      }
      const canEnter =
        passport.status === PassportStatuses.Pending ||
        (passport.status === PassportStatuses.Proceed && !isPassed(passport.validUntil))

      if (canEnter) {
        const result = await this.accessService.handleEnter(access)
        responseBody.dependants = Object.keys(result.dependants).map((key) => ({
          firstName: result.dependants[key].firstName,
          lastNameInitial: result.dependants[key].lastNameInitial,
        }))
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
      const includeGuardian =
        (req.body.guardianExiting ?? access.includesGuardian) && !access.exitAt
      // if unspecified, all remaining dependents
      const dependantIds: string[] = (
        req.body.exitingDependantIds ?? Object.keys(access.dependants)
      ).filter((key: string) => !access.dependants[key].exitAt)

      if (!includeGuardian && !dependantIds.length) {
        // access service would throw an error here, we want to skip the extra queries
        // and give a more helpful error
        if (
          !req.body.hasOwnProperty('guardianExiting') &&
          !req.body.hasOwnProperty('exitingDependantIds')
        ) {
          throw new BadRequestException('Token already used to exit')
        } else {
          throw new BadRequestException('All specified users have already exited')
        }
      }

      const passport = await this.passportService.findOneByToken(access.statusToken)
      const user = await this.userService.findOne(userId)
      if (!user) {
        throw new ResourceNotFoundException(`Cannot find user with ID [${userId}]`)
      }
      if (userId !== access.userId) {
        // TODO: we could remove userId from this request
        throw new UnauthorizedException(`Access ${accessToken} does not belong to ${userId}`)
      }
      const responseBody = {
        passport,
        base64Photo: user.base64Photo,
        dependants: [],
        includesGuardian: includeGuardian,
      }
      const result = await this.accessService.handleExit(access, includeGuardian, dependantIds)
      responseBody.dependants = Object.keys(result.dependants)
        // we only want to return the dependants *currently* exiting
        .filter((key) => dependantIds.includes(key))
        .map((key) => ({
          firstName: result.dependants[key].firstName,
          lastNameInitial: result.dependants[key].lastNameInitial,
        }))

      res.json(actionSucceed(responseBody))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminController
