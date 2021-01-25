import * as express from 'express'
import {NextFunction, Request, Response} from 'express'

import IRouteController from '../../../../common/src/interfaces/IRouteController.interface'
import {authorizationMiddleware} from '../../../../common/src/middlewares/authorization'
import {isPassed} from '../../../../common/src/utils/datetime-util'
import {actionFailed, actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {BadRequestException} from '../../../../common/src/exceptions/bad-request-exception'
import {ResourceNotFoundException} from 'packages/common/src/exceptions/resource-not-found-exception'
import {UserService} from '../../../../common/src/service/user/user-service'
import {RequiredUserPermission} from '../../../../common/src/types/authorization'

import {PassportService} from '../../../../passport/src/services/passport-service'
import {AttestationService} from '../../../../passport/src/services/attestation-service'
import {PassportStatuses} from '../../../../passport/src/models/passport'

import {OrganizationService} from '../../../../enterprise/src/services/organization-service'
import {OrganizationLocation} from '../../../../enterprise/src/models/organization'

import {AccessService} from '../../service/access.service'
import {AccessTokenService} from '../../service/access-token.service'
import {AccessModel} from '../../repository/access.repository'

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
    const auth = authorizationMiddleware([RequiredUserPermission.RegUser], true)
    const routes = express
      .Router()
      .post('/entryToken', this.createToken) // create a token to be scanned by an admin
      .post('/entry', this.enter) // create a token and immediately enter
      .post('/exit', this.exit) // exit, wherever the user currently is
    this.router.use('/access/api/v1', auth, routes)
  }

  private async createAccess(
    statusToken: string,
    locationId: string,
    userId: string,
    includeGuardian: boolean,
    organizationId: string,
    dependantIds: string[],
  ): Promise<AccessModel> {
    if (!includeGuardian && dependantIds.length === 0) {
      throw new BadRequestException('Must specify at least one user (guardian and/or dependant)')
    }
    if (dependantIds.length) {
      const allDependants = await this.userService.getAllDependants(userId, true)
      dependantIds.forEach((id) => {
        const dependant = allDependants.find((dep) => dep.id === id)
        if (!dependant?.organizationIds.includes(organizationId)) {
          throw new ResourceNotFoundException(
            `No dependant ${id} in organization ${organizationId}`,
          )
        }
      })
    }
    return this.accessTokenService.createToken(
      statusToken,
      locationId,
      userId,
      dependantIds,
      includeGuardian,
    )
  }

  createToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {statusToken, locationId, userId, includeGuardian, organizationId} = req.body
      const dependantIds: string[] = req.body.dependantIds ?? []
      // errors if no location is found
      await this.lookupLocation(organizationId, locationId)
      const access = await this.createAccess(
        statusToken,
        locationId,
        userId,
        includeGuardian,
        organizationId,
        dependantIds,
      )

      const response = access
        ? actionSucceed(access)
        : actionFailed('Access denied: Cannot grant access for the given status-token')

      res.status(access ? 200 : 403).json(response)
    } catch (error) {
      next(error)
    }
  }

  enter = async (req: Request, res: Response, next: NextFunction): Promise<unknown> => {
    // TODO: this should probably fail if the user is checked in somewhere else
    try {
      const {statusToken, locationId, userId, includeGuardian, organizationId} = req.body
      const dependantIds: string[] = req.body.dependantIds ?? []
      // errors if no location is found
      const location = await this.lookupLocation(organizationId, locationId)
      if (!location.allowsSelfCheckInOut)
        throw new BadRequestException("Location doesn't allow self-check-in")

      if (!location.allowAccess)
        throw new BadRequestException("Location can't be directly checked in to")

      const access = await this.createAccess(
        statusToken,
        locationId,
        userId,
        includeGuardian,
        organizationId,
        dependantIds,
      )
      if (!access) {
        throw new BadRequestException("Couldn't create access")
      }
      return location.attestationRequired
        ? await this.enterWithAttestation(res, access)
        : await this.enterWithoutAttestation(res, access)
    } catch (error) {
      next(error)
    }
  }

  exit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // TODO: this should simply remove the user from their current location, wherever it is
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

  private async enterWithAttestation(res: Response, access: AccessModel): Promise<unknown> {
    const passport = await this.passportService.findOneByToken(access.statusToken)

    const canEnter = passport.status === PassportStatuses.Proceed && !isPassed(passport.validUntil)

    if (canEnter) {
      const newAccess = await this.accessService.handleEnter(access)
      return res.json(actionSucceed(newAccess))
    }

    return res.status(400).json(actionFailed('Access denied for access-token'))
  }

  private async lookupLocation(
    organizationId: string,
    locationId: string,
  ): Promise<OrganizationLocation> {
    const location = await this.organizationService.getLocation(organizationId, locationId)
    if (!location) {
      throw new ResourceNotFoundException(`location ${organizationId}/${locationId} does not exist`)
    }
    return location
  }

  private async enterWithoutAttestation(res: Response, access: AccessModel): Promise<unknown> {
    const {userId} = access
    const allIds = Object.keys(access.dependants)
    if (access.includesGuardian) {
      allIds.push(userId)
    }
    const allStatuses = await Promise.all(
      allIds.map((id) => this.attestationService.latestStatus(id)),
    )
    if (allStatuses.includes('stop')) {
      throw new BadRequestException(`current status is stop`)
    }
    if (allStatuses.includes('caution')) {
      throw new BadRequestException(`current status is caution`)
    }
    const newAccess = await this.accessService.handleEnter(access)

    return res.json(actionSucceed(newAccess))
  }
}

export default UserController
