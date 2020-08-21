import * as express from 'express'
import {NextFunction, Request, Response} from 'express'
import IRouteController from '../../../common/src/interfaces/IRouteController.interface'

import Validation from '../../../common/src/utils/validation'
import {PassportService} from '../../../passport/src/services/passport-service'
import {PassportStatuses} from '../../../passport/src/models/passport'
import {isPassed} from '../../../common/src/utils/datetime-util'
import {AccessService} from '../service/access.service'
import {actionFailed, actionSucceed} from '../../../common/src/utils/response-wrapper'
import {Config} from '../../../common/src/utils/config'

// disables the `includeGuardian` parameter. guardians are never included with dependants
// and always included otherwise
// Leaving this in, but it shouldn't be used anymore
const includeGuardianHack = Config.get('FEATURE_AUTOMATIC_INCLUDE_GUARDIAN') === 'enabled'

// allow 'partial success' for requests where the passport verifies only some dependants
const permissiveMode = Config.get('FEATURE_CREATE_TOKEN_PERMISSIVE_MODE') === 'enabled'
class UserController implements IRouteController {
  public router = express.Router()
  private passportService = new PassportService()
  private accessService = new AccessService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const routes = express
      .Router()
      .post('/createToken', this.createToken)
      .post('/enter', this.enter)
      .post('/exit', this.exit)
      .post('/exposure/verify', this.exposureVerification)
    this.router.use('/user', routes)
  }

  enter = async (req: Request, res: Response, next: NextFunction): Promise<unknown> => {
    try {
      const {accessToken, userId} = req.body
      // check thAT both the organization and location have the 'allowSelfCheckIn' flag enabled
      // (not yet implemented)
      const access = await this.accessService.findOneByToken(accessToken)
      const passport = await this.passportService.findOneByToken(access.statusToken)
      // need to add this
      const user = await this.userService.findOne(userId)
      if (!user) {
        throw new ResourceNotFoundException(`Cannot find user with ID [${userId}]`)
      }
      if (userId !== access.userId) {
        // TODO: we could remove userId from this request
        throw new UnauthorizedException(`Access ${accessToken} does not belong to ${userId}`)
      }
      const canEnter =
        passport.status === PassportStatuses.Pending ||
        (passport.status === PassportStatuses.Proceed && !isPassed(passport.validUntil))

      if (canEnter) {
        // add a "self" flag as param 2
        await this.accessService.handleEnter(access, true)
        return res.json(actionSucceed())
      }

      res.status(400).json(actionFailed('Access denied for access-token'))
    } catch (error) {
      next(error)
    }
  }

  exit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {accessToken, userId} = req.body
      const access = await this.accessService.findOneByToken(accessToken)
      const includeGuardian = (req.body.guardianExiting ?? access.includesGuardian) && !access.exitAt
      // if unspecified, all remaining dependents
      const dependantIds: string[] = (
        req.body.exitingDependantIds ?? Object.keys(access.dependants)
      ).filter((key: string) => !access.dependants[key].exitAt)
      // check that BOTH the organization and location have the 'allowSelfCheckIn' flag enabled
      // (not yet implemented)
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

      const user = await this.userService.findOne(userId)
      if (!user) {
        throw new ResourceNotFoundException(`Cannot find user with ID [${userId}]`)
      }
      if (userId !== access.userId) {
        throw new UnauthorizedException(`Access ${accessToken} does not belong to ${userId}`)
      }
      // add a "self" flag as param 4
      await this.accessService.handleExit(access, includeGuardian, dependantIds, true)
    } catch (error) {
      next(error)
    }
  }

  createToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {statusToken, locationId, userId} = req.body
      const dependantIds: string[] = req.body.dependantIds ?? []
      const includeGuardian = includeGuardianHack
        ? !dependantIds.length
        : req.body.includeGuardian ?? true
      const passport = await this.passportService.findOneByToken(statusToken)

      const fail = (reason: string) => res.status(403).json(actionFailed(reason))

      if (!passport) {
        fail('Access denied: status-token does not link to a passport')
        return
      }

      if (passport.userId !== userId) {
        // TODO: we could remove userId from this call
        fail(`Access denied: passport does not belong to ${userId}`)
        return
      }
      if (
        !(
          passport.status === PassportStatuses.Pending ||
          (passport.status === PassportStatuses.Proceed && !isPassed(passport.validUntil))
        )
      ) {
        fail('Access denied: this passport does not permit entry')
        return
      }

      const enteringDependantIds = dependantIds.filter((depId) =>
        passport.dependantIds.includes(depId),
      )
      if (permissiveMode) {
        if (!enteringDependantIds.length && !includeGuardian) {
          fail('Access denied: this passport does not apply to any specified users')
          return
        } else if (enteringDependantIds.length < dependantIds.length) {
          console.warn(
            `Allowing 'partial credit' entry (requested: ${dependantIds.join()} - entering: ${enteringDependantIds.join()})`,
          )
        }
      } else if (enteringDependantIds.length < dependantIds.length) {
        fail('Access denied: this passport does not apply to all dependants')
        return
      }

      const access = await this.accessService.create(
        statusToken,
        locationId,
        userId,
        includeGuardian,
        enteringDependantIds,
      )

      const response = access
        ? actionSucceed(access)
        : actionFailed('Access denied: Cannot grant access for the given status-token')

      res.status(access ? 200 : 403).json(response)
    } catch (error) {
      next(error)
    }
  }

  exposureVerification = (req: Request, res: Response): void => {
    if (!Validation.validate(['accessToken', 'locationId'], req, res)) {
      return
    }

    console.log(req.body.accessToken)
    const response = {
      data: {
        exposed: false,
      },
      serverTimestamp: new Date().toISOString(),
      status: 'complete',
    }

    res.json(response)
  }
}

export default UserController
