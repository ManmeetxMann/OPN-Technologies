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
import {now} from '../../../../../common/src/utils/times'
import {User, userDTO} from '../../../../../common/src/data/user'
import {AdminProfile} from '../../../../../common/src/data/admin'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'
import {ResponseStatusCodes} from '../../../../../common/src/types/response-status'
import {UnauthorizedException} from '../../../../../common/src/exceptions/unauthorized-exception'
import {ResourceNotFoundException} from '../../../../../common/src/exceptions/resource-not-found-exception'
import {ForbiddenException} from '../../../../../common/src/exceptions/forbidden-exception'
import {UserService} from '../../../../../common/src/service/user/user-service'
import {NfcTagService} from '../../../../../common/src/service/hardware/nfctag-service'

const replyInsufficientPermission = (res: Response) =>
  res
    .status(403)
    .json(
      of(null, ResponseStatusCodes.AccessDenied, 'Insufficient permissions to fulfil the request'),
    )
const replyUnauthorizedEntry = (res: Response) =>
  res
    .status(403)
    .json(of(null, ResponseStatusCodes.AccessDenied, 'Must have Proceed badge to enter/exit'))

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
    // enter a user into a location
    // if autoExit is true, the user will be checked out of their current location
    // otherwise, if they are checked in somewhere the request will fail
    try {
      const {userId, locationId, autoExit} = req.body
      const {organizationId} = res.locals
      const [user, location] = await Promise.all([
        this.userService.findOne(userId),
        this.organizationService.getLocation(organizationId, locationId),
      ])
      // backwards compat for multi-user access
      const {delegates: delegateIds} = user
      const potentialParentIds = [null, ...(delegateIds ?? [])]

      if (!location) {
        throw new ForbiddenException(
          `Location ${locationId} does not exist or does not belong to organization ${organizationId}`,
        )
      }
      if (!location.allowAccess) {
        throw new ForbiddenException('Location does not permit direct check-in')
      }

      const latestPassports = (
        await Promise.all(
          potentialParentIds.map((parent) =>
            this.passportService.findLatestPassport(userId, parent),
          ),
        )
      ).filter((notNull) => notNull)
      if (!latestPassports.length) {
        throw new ForbiddenException('User has no valid passports')
      }
      // passport might be regenerated
      let selectedPassport = latestPassports.reduce((selected, candidate) => {
        if (
          // @ts-ignore
          safeTimestamp(selected.timestamps.createdAt) <
          // @ts-ignore
          safeTimestamp(candidate.timestamps.createdAt)
        ) {
          return candidate
        }
        return selected
      })
      if (
        !(
          selectedPassport.status === PassportStatuses.Pending ||
          (selectedPassport.status === PassportStatuses.Proceed &&
            !isPassed(safeTimestamp(selectedPassport.validUntil)))
        )
      ) {
        // TODO: make a pending passport here?
        throw new ForbiddenException('Current passport does not permit entry')
      }

      // find current location
      const latestAccess = await this.accessService.findLatestAnywhere(userId, delegateIds ?? [])
      const currentLocation =
        latestAccess?.enteredAt && !latestAccess.exitAt ? latestAccess.locationId : null
      if (currentLocation) {
        if (!autoExit) {
          throw new ForbiddenException('User is still in a location')
        } else {
          const newData = await this.forceExit(latestAccess, userId)
          selectedPassport = newData.passport
        }
      }

      const enteringAccess = await this.accessTokenService.createToken(
        selectedPassport.statusToken,
        locationId,
        userId,
        [],
        true,
      )
      const access = await this.accessService.handleEnterV2(enteringAccess)
      const responseBody = {
        access: accessDTOResponseV1(access),
        passport: passportDTO(selectedPassport),
        user: userDTO(user),
      }
      res.json(actionSucceed(responseBody))
    } catch (error) {
      next(error)
    }
  }
  exit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // exit a user from their current location (wherever it is)
    // optional - if locationId is provided, require the user's current location to be that location
    try {
      const {userId, locationId} = req.body
      const user = await this.userService.findOne(userId)
      // backwards compat for multi-user access
      const {delegates: delegateIds} = user
      const latestAccess = await this.accessService.findLatestAnywhere(userId, delegateIds ?? [])
      if (!latestAccess) {
        throw new ForbiddenException('User is not in any location')
      }
      const isDirect = latestAccess.userId === userId
      const timestampBearer = isDirect ? latestAccess : latestAccess.dependants[userId]
      if (timestampBearer.exitAt) {
        throw new ForbiddenException('User is not in any location')
      }
      if (locationId && latestAccess.locationId !== locationId) {
        throw new ForbiddenException(`User is not in location ${locationId}`)
      }
      const {access, passport} = await this.forceExit(latestAccess, userId)
      const responseBody = {
        access: accessDTOResponseV1(access),
        passport: passportDTO(passport),
        user: userDTO(user),
      }
      res.json(actionSucceed(responseBody))
    } catch (error) {
      next(error)
    }
  }

  forceExit = async (
    access: AccessModel,
    userId: string,
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
        passport = await this.passportService.create(PassportStatuses.Pending, userId, [], true)
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
      const user = await this.userService.findOne(tag.userId)
      const parentUserId = user.delegates?.length ? user.delegates[0] : null
      const isADependant = !!parentUserId
      const latestPassport = await this.passportService.findLatestPassport(tag.userId, parentUserId)
      const authorizedUserIds = new Set(latestPassport.dependantIds ?? [])
      if (latestPassport.includesGuardian) {
        authorizedUserIds.add(latestPassport.userId)
      }
      // Make sure it's valid
      if (
        !latestPassport ||
        !authorizedUserIds.has(tag.userId) ||
        latestPassport.status !== 'proceed'
      ) {
        replyUnauthorizedEntry(res)
        return
      }

      // Let's get the access assuming that user is already Proceed
      // Note we are only looking for ones that authenticated by this admin account
      const access = await this.accessService.findLatest(
        tag.userId,
        parentUserId,
        locationId,
        now(),
        authenticatedUserId,
      )

      // Check if access does not exist or if they've exited
      // Note we are not checking for entered at as assuming that the enteredAt is there :-)
      const shouldEnter = !access || (isADependant ? access.dependants[tag.userId] : access)?.exitAt
      if (shouldEnter) {
        // Create new Access
        const accessToken = await this.accessTokenService.createToken(
          latestPassport.statusToken,
          locationId,
          isADependant ? parentUserId : tag.userId,
          isADependant ? [tag.userId] : [],
          !isADependant,
          authenticatedUserId,
        )

        const accessForEntering = await this.accessService.handleEnterV2(accessToken)
        res.json(actionSucceed(accessForEntering))
      } else {
        // Get Latest Passport (as they need a valid access)
        const specificPassport = await this.passportService.findOneByToken(access.statusToken)
        const specificAuthorizedUserIds = new Set(specificPassport.dependantIds ?? [])
        if (specificPassport.includesGuardian) {
          specificAuthorizedUserIds.add(specificPassport.userId)
        }
        // Make sure it's valid
        if (
          !specificPassport ||
          !specificAuthorizedUserIds.has(tag.userId) ||
          specificPassport.status !== 'proceed'
        ) {
          replyUnauthorizedEntry(res)
          return
        }

        // Decide
        const shouldExit =
          access && (isADependant ? access.dependants[tag.userId] : access)?.enteredAt
        const accessForEnteringOrExiting = shouldExit
          ? await this.accessService.handleExitV2(access)
          : await this.accessService.handleEnterV2(access)

        res.json(
          actionSucceed({
            access: accessDTOResponseV1(accessForEnteringOrExiting),
            passport: passportDTO(latestPassport),
            user: userDTO(user),
          }),
        )
      }
    } catch (error) {
      next(error)
    }
  }
}

export default AdminController
