import * as express from 'express'
import {NextFunction, Request, Response} from 'express'
import * as _ from 'lodash'

import {PassportService} from '../../../../../passport/src/services/passport-service'
import {PassportStatuses, Passport, passportDTO} from '../../../../../passport/src/models/passport'

import {OrganizationService} from '../../../../../enterprise/src/services/organization-service'

import {AccessService} from '../../../service/access.service'
import {AccessTokenService} from '../../../service/access-token.service'
import {AccessModel} from '../../../repository/access.repository'
import {accessDTOResponseV1} from '../../../models/access'

import IRouteController from '../../../../../common/src/interfaces/IRouteController.interface'
import {isPassed, safeTimestamp} from '../../../../../common/src/utils/datetime-util'
import {actionSucceed, of} from '../../../../../common/src/utils/response-wrapper'
import {User, userDTO} from '../../../../../common/src/data/user'
import {AdminProfile} from '../../../../../common/src/data/admin'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'
import {ResponseStatusCodes} from '../../../../../common/src/types/response-status'
import {UnauthorizedException} from '../../../../../common/src/exceptions/unauthorized-exception'
import {ResourceNotFoundException} from '../../../../../common/src/exceptions/resource-not-found-exception'
import {BadRequestException} from '../../../../../common/src/exceptions/bad-request-exception'
import {ForbiddenException} from '../../../../../common/src/exceptions/forbidden-exception'
import {UserService} from '../../../../../common/src/service/user/user-service'
import {NfcTagService} from '../../../../../common/src/service/hardware/nfctag-service'

const replyInsufficientPermission = (res: Response) =>
  res
    .status(403)
    .json(
      of(null, ResponseStatusCodes.AccessDenied, 'Insufficient permissions to fulfil the request'),
    )

class AdminController implements IRouteController {
  public router = express.Router()
  private passportService = new PassportService()
  private accessService = new AccessService()
  private userService = new UserService()
  private organizationService = new OrganizationService()
  private accessTokenService = new AccessTokenService(
    this.organizationService,
    this.passportService,
    this.accessService,
  )
  private tagService = new NfcTagService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const requireAdminWithOrg = authorizationMiddleware([RequiredUserPermission.OrgAdmin], true)
    const routes = express
      .Router()
      // scan a token
      .post('/scan-enter', requireAdminWithOrg, this.scanEnter)
      .post('/scan-exit', requireAdminWithOrg, this.scanExit)
      // manually check someone in or out
      .post('/enter', requireAdminWithOrg, this.enter)
      .post('/exit', requireAdminWithOrg, this.exit)
      .post('/enter-or-exit/tag', requireAdminWithOrg, this.enterOrExitUsingATag)
      .get('/stats', requireAdminWithOrg, this.stats)
    this.router.use('/access/api/v1/admin/access', routes)
  }

  stats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {locationId} = req.query
      const {organizationId} = res.locals
      const orgLocations = await this.organizationService.getLocations(organizationId)
      if (locationId && !orgLocations.some(({id}) => id === locationId)) {
        throw new ForbiddenException(
          `location ${locationId} is not part of organization ${organizationId}`,
        )
      }
      const locationIds = locationId ? [locationId] : _.map(orgLocations, 'id')
      const stats = await this.accessService.getTodayStatsForLocations(locationIds)
      const responseBody = _.omit(stats, ['id', 'createdAt'])
      // TODO: add asOfDateTime, checkInsPerHour?
      res.json(actionSucceed(responseBody))
    } catch (error) {
      next(error)
    }
  }

  scanEnter = async (req: Request, res: Response, next: NextFunction): Promise<unknown> => {
    // used when an admin scans an access token
    try {
      const {accessToken} = req.body
      const {organizationId} = res.locals
      const access = await this.accessService.findOneByToken(accessToken)
      const {userId, locationId} = access
      const [passport, {guardian: user, dependants}, location] = await Promise.all([
        this.passportService.findOneByToken(access.statusToken),
        this.userService.getUserAndDependants(userId),
        this.organizationService.getLocation(organizationId, locationId),
      ])

      if (!location) {
        throw new ForbiddenException(
          `Location ${locationId} does not exist or does not belong to organization ${organizationId}`,
        )
      }
      if (!location.allowAccess) {
        throw new ForbiddenException('Location does not permit direct check-in')
      }

      const authenticatedUser = res.locals.connectedUser as User
      const adminForLocations = (authenticatedUser.admin as AdminProfile).adminForLocationIds
      const adminForOrganization = (authenticatedUser.admin as AdminProfile).adminForOrganizationId
      if (adminForOrganization !== organizationId) {
        throw new UnauthorizedException(`Not an admin for organization ${organizationId}`)
      }
      if (
        !(
          adminForLocations.includes(location.id) ||
          (location.parentLocationId && adminForLocations.includes(location.parentLocationId))
        )
      ) {
        throw new UnauthorizedException(`Not an admin for location ${location.id}`)
      }
      if (passport.status === PassportStatuses.Proceed && isPassed(passport.validUntil)) {
        throw new UnauthorizedException(`Passport ${passport.id} has expired`)
      }

      const newAccess = await this.accessService.handleEnterV2(access)
      const responseBody = {
        access: accessDTOResponseV1(newAccess),
        passport: passportDTO(passport),
        user: userDTO(user),
        dependants: dependants
          .filter(({id}) => newAccess.dependants[id])
          .map((user) => userDTO(user)),
      }
      return res.json(actionSucceed(responseBody))
    } catch (error) {
      next(error)
    }
  }

  scanExit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {accessToken} = req.body
      const access = await this.accessService.findOneByToken(accessToken)
      const {userId} = access
      const [passport, {guardian: user, dependants}] = await Promise.all([
        this.passportService.findOneByToken(access.statusToken),
        this.userService.getUserAndDependants(userId),
      ])
      const newAccess = await this.accessService.handleExitV2(access)
      const responseBody = {
        access: accessDTOResponseV1(newAccess),
        passport: passportDTO(passport),
        user: userDTO(user),
        dependants: dependants
          .filter(({id}) => newAccess.dependants[id])
          .map((user) => userDTO(user)),
      }
      res.json(actionSucceed(responseBody))
    } catch (error) {
      next(error)
    }
  }

  enter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // enter some users into a location
    try {
      const {locationId, userIds, organizationId} = req.body as {
        locationId: string
        userIds: string[]
        organizationId: string
      }
      const userId = res.locals.user.id
      const allUsers = await Promise.all(userIds.map((id) => this.userService.findOne(id)))

      allUsers.forEach((user) => {
        if (!user.organizationIds?.includes(organizationId)) {
          throw new ForbiddenException(`User ${user.id} is not a part of ${organizationId}`)
        }
      })
      const location = await this.organizationService.getLocation(organizationId, locationId)
      if (!location) throw new ResourceNotFoundException('Location not found')
      if (!location.allowsSelfCheckInOut)
        throw new ForbiddenException("Location doesn't allow self-check-in")

      if (!location.allowAccess)
        throw new ForbiddenException("Location can't be directly checked in to")

      const allPassports = await Promise.all(
        userIds.map((id) => this.passportService.findLatestDirectPassport(id, organizationId)),
      )
      allPassports.forEach((passport) => {
        if (!this.passportService.passportAllowsEntry(passport, location.attestationRequired)) {
          throw new ForbiddenException('Passport not found or does not allow entry')
        }
      })
      const accesses = await Promise.all(
        userIds.map((id, index) =>
          this.accessService.createV2(
            id,
            locationId,
            allPassports[index]?.statusToken ?? null,
            userId,
          ),
        ),
      )

      const responseBody = allUsers.map((user, index) => ({
        user: userDTO(user),
        passport: allPassports[index] ? passportDTO(allPassports[index]) : null,
        access: accessDTOResponseV1(accesses[index]),
      }))

      res.json(actionSucceed(responseBody))
    } catch (error) {
      next(error)
    }
  }
  exit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // exit a user from their current location (wherever it is)
    // optional - if locationId is provided, require the user's current location to be that location
    try {
      const {userIds, organizationId} = req.body as {
        userIds: string[]
        organizationId: string
      }
      const allUsers = await Promise.all(userIds.map((id) => this.userService.findOne(id)))

      allUsers.forEach((user) => {
        if (!user.organizationIds?.includes(organizationId)) {
          throw new ForbiddenException(`User ${user.id} is not a part of ${organizationId}`)
        }
      })
      const accesses = await Promise.all(
        userIds.map((id) => this.accessService.findLatestAnywhere(id)),
      )
      accesses.forEach((acc) => {
        if (acc.exitAt && isPassed(safeTimestamp(acc.exitAt))) {
          throw new BadRequestException('Already exited')
        }
      })

      const newAccesses = await Promise.all(
        accesses.map((access) => this.accessService.handleExitV2(access)),
      )

      const responseBody = allUsers.map((user, index) => ({
        user: userDTO(user),
        access: accessDTOResponseV1(newAccesses[index]),
      }))

      res.json(actionSucceed(responseBody))
    } catch (error) {
      next(error)
    }
  }

  forceExit = async (
    access: AccessModel,
    userId: string,
    organizationId: string,
  ): Promise<{passport: Passport; access: AccessModel}> => {
    // utility method.
    // make the user exit using the given access. If that would have side effects (i.e. other users exiting)
    // create a new access instead. If needed, create a new (pending) passport
    const isSoleUser =
      (access.userId === userId &&
        access.includesGuardian &&
        !Object.keys(access.dependants).length) ||
      (access.userId !== userId &&
        !access.includesGuardian &&
        Object.keys(access.dependants).length === 1 &&
        access[userId])
    let passport: Passport = null
    let newAccess: AccessModel = null
    if (isSoleUser) {
      passport = await this.passportService.findOneByToken(access.statusToken)
      newAccess = await this.accessService.handleExitV2(access)
    } else {
      // latestAccess contains other users
      // we must create a new access
      try {
        passport = await this.passportService.findOneByToken(access.statusToken, true)
      } catch (err) {
        passport = await this.passportService.create(
          PassportStatuses.Pending,
          userId,
          [],
          true,
          organizationId,
        )
      }
      const soleAccess = await this.accessTokenService.createToken(
        passport.statusToken,
        access.locationId,
        userId,
        [],
        true,
      )
      newAccess = await this.accessService.handleExitV2(soleAccess)
    }
    return {
      access: newAccess,
      passport,
    }
  }

  enterOrExitUsingATag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get request inputs
      const {tagId, locationId, legacyMode} = req.body

      // Get tag appropriately
      const tag = await (legacyMode
        ? this.tagService.getByLegacyId(tagId)
        : this.tagService.getById(tagId))
      if (!tag) {
        throw new ResourceNotFoundException(`NFC Tag not found`)
      }

      // Save org
      const organizationId = tag.organizationId
      if (res.locals.organizationId !== organizationId) {
        throw new UnauthorizedException(
          `Tag does not belong to organization ${res.locals.organizationId}`,
        )
      }

      // Make sure the admin is allowed
      const authenticatedUser = res.locals.connectedUser as User
      const admin = authenticatedUser.admin as AdminProfile
      const isNFCGateKioskAdmin = admin.nfcGateKioskAdminForOrganizationIds?.includes(
        organizationId,
      )
      const authenticatedUserId = authenticatedUser.id

      // Check if allowed
      if (!(isNFCGateKioskAdmin || admin.adminForOrganizationId === organizationId)) {
        replyInsufficientPermission(res)
        return
      }
      const latestAccess = await this.accessService.findLatestAnywhere(tag.userId)

      const shouldEnter =
        // never entered anywhere
        !latestAccess ||
        // not at this location
        latestAccess.locationId !== locationId ||
        // last at this location but already exited
        (latestAccess.exitAt && isPassed(safeTimestamp(latestAccess.exitAt)))

      // only need to look up if we're entering
      const latestPassport = shouldEnter
        ? await this.passportService.findLatestDirectPassport(tag.userId, organizationId)
        : null
      const location = await this.organizationService.getLocation(organizationId, locationId)
      let access
      if (shouldEnter) {
        if (
          this.passportService.passportAllowsEntry(latestPassport, location.attestationRequired)
        ) {
          // Let's get the access assuming that user is already Proceed
          // Note we are only looking for ones that authenticated by this admin account
          access = await this.accessService.createV2(
            tag.userId,
            locationId,
            location.attestationRequired ? latestPassport.statusToken : null,
            authenticatedUserId,
          )
        } else {
          throw new ForbiddenException('Passport does not allow entry')
        }
      } else {
        access = this.accessService.handleExitV2(latestAccess)
      }
      res.json(
        actionSucceed({
          access: accessDTOResponseV1(access),
          passport: passportDTO(latestPassport),
        }),
      )
    } catch (error) {
      next(error)
    }
  }
}

export default AdminController
