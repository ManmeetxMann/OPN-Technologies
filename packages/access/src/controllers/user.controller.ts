import * as express from 'express'
import {NextFunction, Request, Response} from 'express'
import IRouteController from '../../../common/src/interfaces/IRouteController.interface'

import Validation from '../../../common/src/utils/validation'
import {PassportService} from '../../../passport/src/services/passport-service'
import {AttestationService} from '../../../passport/src/services/attestation-service'
import {PassportStatuses, PassportType} from '../../../passport/src/models/passport'
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
        : await this.enterWithoutAttestation(res, accessToken)
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
      const user = await this.userService.findOne(userId)
      const {base64Photo} = user
      const newAccess = await this.accessService.handleExit(access)

      res.json(
        actionSucceed({
          passport,
          base64Photo,
          dependants,
          includesGuardian,
          access: {
            ...newAccess,
            user,
            status: passport.status,
          },
        }),
      )
    } catch (error) {
      next(error)
    }
  }

  createToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {statusToken, locationId, userId, includeGuardian} = req.body
      const dependantIds: string[] = req.body.dependantIds ?? []
      if (!includeGuardian && dependantIds.length === 0) {
        throw new BadRequestException('Must specify at least one user (guardian and/or dependant)')
      }

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

  // TODO: this is not in swagger
  exposureVerification = (req: Request, res: Response): void => {
    if (!Validation.validate(['accessToken', 'locationId'], req, res)) {
      return
    }

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
      const newAccess = await this.accessService.handleEnter(access)
      const {dependants, userId, includesGuardian} = newAccess
      const user = await this.userService.findOne(userId)
      const {base64Photo} = user
      return res.json(
        actionSucceed({
          passport,
          base64Photo,
          dependants,
          includesGuardian,
          access: {
            ...newAccess,
            user,
            status: passport.status,
          },
        }),
      )
    }

    return res.status(400).json(actionFailed('Access denied for access-token'))
  }

  private async enterWithoutAttestation(res: Response, accessToken: string): Promise<unknown> {
    const access = await this.accessService.findOneByToken(accessToken)
    const {userId} = access
    const allIds = Object.keys(access.dependants)
    if (access.includesGuardian) {
      allIds.push(userId)
    }
    const {organizationId} = await this.organizationService.getLocationById(access.locationId)
    const allStatuses = await Promise.all(
      allIds.map((id) => this.attestationService.latestStatus(id, organizationId)),
    )
    if (allStatuses.includes('stop')) {
      throw new BadRequestException(`current status is stop`)
    }
    if (allStatuses.includes('caution')) {
      throw new BadRequestException(`current status is caution`)
    }
    if (allStatuses.includes('temperature_check_required')) {
      throw new BadRequestException(`current status is temperature_check_required`)
    }
    const status = allStatuses.includes('pending') ? 'pending' : 'proceed'

    const user = await this.userService.findOne(userId)
    const {base64Photo} = user
    const passport = await this.passportService.create(
      PassportStatuses.Pending,
      userId,
      [],
      true,
      organizationId,
      PassportType.Attestation,
    )
    const newAccess = await this.accessService.handleEnter(access)

    return res.json(
      actionSucceed({
        passport,
        base64Photo,
        dependants: access.dependants,
        includesGuardian: access.includesGuardian,
        access: {
          ...newAccess,
          // @ts-ignore timestamp, not string
          enteredAt: newAccess.enteredAt?.toDate(),
          // @ts-ignore timestamp, not string
          exitAt: newAccess.exitAt?.toDate(),
          status,
          user,
        },
      }),
    )
  }
}

export default UserController
