import * as express from 'express'
import {NextFunction, Request, Response} from 'express'
import IRouteController from '../../../common/src/interfaces/IRouteController.interface'

import Validation from '../../../common/src/utils/validation'
import {PassportService} from '../../../passport/src/services/passport-service'
import {AttestationService} from '../../../passport/src/services/attestation-service'
import {PassportStatuses} from '../../../passport/src/models/passport'
import {isPassed} from '../../../common/src/utils/datetime-util'
import {AccessService} from '../service/access.service'
import {AccessTokenService} from '../service/access-token.service'
import {actionFailed, actionSucceed} from '../../../common/src/utils/response-wrapper'
import {now} from '../../../common/src/utils/times'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {OrganizationService} from '../../../enterprise/src/services/organization-service'
import {OrganizationLocation} from '../../../enterprise/src/models/organization'
import {UserService} from '../../../common/src/service/user/user-service'

class UserController implements IRouteController {
  public router = express.Router()
  private organizationService = new OrganizationService()
  private passportService = new PassportService()
  private attestationService = new AttestationService()
  private accessService = new AccessService()
  private accessTokenService = new AccessTokenService(
    this.organizationService,
    this.passportService,
    this.accessService,
  )
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
      const {organizationId, locationId, accessToken} = req.body
      const location = await this.organizationService.getLocation(organizationId, locationId)

      if (!location.allowsSelfCheckInOut)
        throw new BadRequestException("Location doesn't allow self-check-in")

      if (!location.allowAccess)
        throw new BadRequestException("Location can't be directly checked in to")

      return location.attestationRequired
        ? await this.enterWithAttestation(res, location, accessToken)
        : await this.enterWithoutAttestation(res, location, accessToken)
    } catch (error) {
      next(error)
    }
  }

  exit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId, locationId, accessToken} = req.body
      const location = await this.organizationService.getLocation(organizationId, locationId)
      if (!location.allowsSelfCheckInOut)
        throw new BadRequestException("Location doesn't allow self-check-out")

      const access = await this.accessService.findOneByToken(accessToken)
      const {userId, statusToken, includesGuardian, dependants} = access

      if (location.id != access.locationId)
        throw new BadRequestException('Access-location mismatch with the entering location')

      const passport = await this.passportService.findOneByToken(statusToken)
      const {base64Photo} = await this.userService.findOne(userId)
      await this.accessService.handleExit(access)

      res.json(actionSucceed({passport, base64Photo, dependants, includesGuardian}))
    } catch (error) {
      next(error)
    }
  }

  createToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {statusToken, locationId, userId, includeGuardian} = req.body
      const dependantIds: string[] = req.body.dependantIds ?? []

      const access = await this.accessTokenService.createToken(
        statusToken,
        locationId,
        userId,
        dependantIds,
        includeGuardian,
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

  private async enterWithAttestation(
    res: Response,
    location: OrganizationLocation,
    accessToken: string,
  ): Promise<unknown> {
    const access = await this.accessService.findOneByToken(accessToken)
    const passport = await this.passportService.findOneByToken(access.statusToken)

    if (location.id != access.locationId)
      throw new BadRequestException('Access-location mismatch with the entering location')

    const canEnter = passport.status === PassportStatuses.Proceed && !isPassed(passport.validUntil)

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
    accessToken: string,
  ): Promise<unknown> {
    const access = await this.accessService.findOneByToken(accessToken)
    const {userId} = access
    const status = await this.attestationService.latestStatus(userId)
    if (['stop', 'caution'].includes(status)) {
      throw new BadRequestException(`current status is ${status}`)
    }

    const {base64Photo} = await this.userService.findOne(userId)
    const passport = await this.passportService.create(PassportStatuses.Pending, userId, [])
    await this.accessService.handleEnter(access)

    return res.json(
      actionSucceed({
        passport,
        base64Photo,
        dependants: access.dependants,
        includesGuardian: access.includesGuardian,
      }),
    )
  }
}

export default UserController
