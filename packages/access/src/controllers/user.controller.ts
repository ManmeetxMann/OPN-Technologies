import * as express from 'express'
import {NextFunction, Request, Response} from 'express'
import IRouteController from '../../../common/src/interfaces/IRouteController.interface'

import Validation from '../../../common/src/utils/validation'
import {PassportService} from '../../../passport/src/services/passport-service'
import {AttestationService} from '../../../passport/src/services/attestation-service'
import {PassportStatuses} from '../../../passport/src/models/passport'
import {isPassed} from '../../../common/src/utils/datetime-util'
import {AccessService} from '../service/access.service'
import {actionFailed, actionSucceed} from '../../../common/src/utils/response-wrapper'
import {now} from '../../../common/src/utils/times'
import {Config} from '../../../common/src/utils/config'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {OrganizationService} from '../../../enterprise/src/services/organization-service'
import {OrganizationLocation} from '../../../enterprise/src/models/organization'
import {UserService} from '../../../common/src/service/user/user-service'
import {AccessModel} from '../repository/access.repository'
import * as _ from 'lodash'

// disables the `includeGuardian` parameter. guardians are never included with dependants
// and always included otherwise
// Leaving this in, but it shouldn't be used anymore
const includeGuardianHack = Config.get('FEATURE_AUTOMATIC_INCLUDE_GUARDIAN') === 'enabled'

// allow 'partial success' for requests where the passport verifies only some dependants
const permissiveMode = Config.get('FEATURE_CREATE_TOKEN_PERMISSIVE_MODE') === 'enabled'
class UserController implements IRouteController {
  public router = express.Router()
  private organizationService = new OrganizationService()
  private passportService = new PassportService()
  private attestationService = new AttestationService()
  private accessService = new AccessService()
  private userService = new UserService()

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
      const {organizationId, locationId, accessToken, userId} = req.body
      const location = await this.organizationService.getLocation(organizationId, locationId)

      if (!location.allowsSelfCheckInOut)
        throw new BadRequestException("Location doesn't allow self-check-in")
      if (!location.allowAccess)
        throw new BadRequestException("Location can't be directly checked in to")

      if (location.attestationRequired && !accessToken)
        throw new BadRequestException(
          'Access-token is missing while self-attestation is required at that location',
        )
      if (!location.attestationRequired && !userId)
        throw new BadRequestException(
          'User-id must be provided when self-attestation is NOT required',
        )

      return location.attestationRequired
        ? await this.enterWithAccessToken(res, location, accessToken)
        : await this.enterWithoutAttestation(res, location, userId)
    } catch (error) {
      next(error)
    }
  }

  exit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId, locationId, accessToken, guardianExiting, dependantIds} = req.body
      const location = await this.organizationService.getLocation(organizationId, locationId)
      if (!location.allowsSelfCheckInOut)
        throw new BadRequestException("Location doesn't allow self-check-out")

      const access = await this.accessService.findOneByToken(accessToken)
      const {userId, statusToken, includesGuardian, dependants, exitAt} = access
      const exitableDependantIds = (dependantIds ?? _.keys(dependants) ?? []).filter(
        (id) => !access.dependants[id].exitAt,
      )
      if (!!exitAt || (!_.isEmpty(access.dependants) && _.isEmpty(exitableDependantIds)))
        throw new BadRequestException('Access has already being used to exit')

      if (location.id != access.locationId)
        throw new BadRequestException('Access-location mismatch with the entering location')

      const passport = await this.passportService.findOneByToken(statusToken)
      const {base64Photo} = await this.userService.findOne(userId)
      await this.accessService.handleExit(
        access,
        (guardianExiting ?? includesGuardian) && !exitAt,
        exitableDependantIds,
      )

      res.json(actionSucceed({passport, base64Photo, dependants, includesGuardian}))
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
      serverTimestamp: now().toISOString(),
      status: 'complete',
    }

    res.json(response)
  }

  private async enterWithAccessToken(
    res: Response,
    location: OrganizationLocation,
    accessToken: string,
  ): Promise<unknown> {
    const access = await this.accessService.findOneByToken(accessToken)
    const passport = await this.passportService.findOneByToken(access.statusToken)

    if (location.id != access.locationId)
      throw new BadRequestException('Access-location mismatch with the entering location')

    const canEnter =
      passport.status === PassportStatuses.Pending ||
      (passport.status === PassportStatuses.Proceed && !isPassed(passport.validUntil))

    if (canEnter) {
      const {dependants, userId, includesGuardian} = await this.accessService.handleEnter(access)
      const {base64Photo} = await this.userService.findOne(userId)
      return res.json(actionSucceed({passport, base64Photo, dependants, includesGuardian}))
    }

    return res.status(400).json(actionFailed('Access denied for access-token'))
  }

  private async enterWithoutAttestation(
    res: Response,
    location: OrganizationLocation,
    userId: string,
  ): Promise<unknown> {

    const status = await this.attestationService.latestStatus(userId)
    if (['stop', 'caution'].includes(status)) {
      throw new BadRequestException(`cureent status is ${status}`)
    }

    const {base64Photo} = await this.userService.findOne(userId)
    const passport = await this.passportService.create(PassportStatuses.Proceed, userId, [])
    const {includesGuardian, dependants} = await this.accessService
      .create(passport.statusToken, location.id, userId, false, [])
      .then((access) => this.accessService.handleEnter(access as AccessModel))

    return res.json(actionSucceed({passport, base64Photo, dependants, includesGuardian}))
  }
}

export default UserController
