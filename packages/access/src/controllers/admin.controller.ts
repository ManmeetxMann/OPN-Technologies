import * as express from 'express'
import {NextFunction, Request, Response} from 'express'
import IRouteController from '../../../common/src/interfaces/IRouteController.interface'
import {PassportService} from '../../../passport/src/services/passport-service'
import {OrganizationService} from '../../../enterprise/src/services/organization-service'
import {AccessService} from '../service/access.service'
import {
  actionFailed,
  actionSucceed as rawSucceed,
  of,
} from '../../../common/src/utils/response-wrapper'
import {PassportStatuses} from '../../../passport/src/models/passport'
import {isPassed} from '../../../common/src/utils/datetime-util'
import {UserService} from '../../../common/src/service/user/user-service'
import {User} from '../../../common/src/data/user'
import {AdminProfile} from '../../../common/src/data/admin'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {UnauthorizedException} from '../../../common/src/exceptions/unauthorized-exception'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {authorizationMiddleware} from '../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../common/src/types/authorization'
import {now} from '../../../common/src/utils/times'
import moment from 'moment-timezone'
import * as _ from 'lodash'
import {Config} from '../../../common/src/utils/config'
import {AccessTokenService} from '../service/access-token.service'
import {ResponseStatusCodes} from '../../../common/src/types/response-status'
import {AccessStats} from '../models/access'
import {NfcTagService} from '../../../common/src/service/hardware/nfctag-service'

const actionSucceed = (body?: unknown, userId?: string): ReturnType<typeof rawSucceed> => {
  if (userId && userId === Config.get('USER_OF_INTEREST')) {
    console.log(`Response to ${userId}`, body)
  }
  return rawSucceed(body)
}

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

const timeZone = Config.get('DEFAULT_TIME_ZONE')

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
    // TODO: all of these should specify the organizationId
    const requireAdmin = authorizationMiddleware([RequiredUserPermission.OrgAdmin], false)
    // const requireAdminWithOrg = authorizationMiddleware([RequiredUserPermission.OrgAdmin], true)
    const routes = express
      .Router()
      .post('/stats', requireAdmin, this.stats)
      // TODO: should be adminWithOrg, but frontend does not always send org.
      // We will do the check locally instead for now
      .post('/stats/v2', requireAdmin, this.statsV2)
      .post('/enter', requireAdmin, this.enter)
      .post('/exit', requireAdmin, this.exit)
      .post('/createToken', requireAdmin, this.createToken)
      .post('/enterorexit/tag', requireAdmin, this.enterOrExitUsingATag)
      .get('/:organizationId/locations/accessible', this.getAccessibleLocations)
    this.router.use('/admin', routes)
  }

  stats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {locationId: locationIdOrPath} = req.body
      // handle (temporarily) `organizations/{orgId}/locations/{locationId}` as the `locationId`
      const paths = locationIdOrPath.split('/')
      const locationId = paths.length > 0 ? paths[paths.length - 1] : locationIdOrPath

      const responseBody = await this.statsHelper(null, locationId)

      res.json(actionSucceed(responseBody))
    } catch (error) {
      next(error)
    }
  }

  statsV2 = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId, locationId} = req.body
      if (!organizationId && !locationId) {
        throw new BadRequestException('either organization or location id must be provided')
      }

      if (!organizationId) {
        // need to determine org based on location
        // to confirm permissions
        const orgId = (await this.organizationService.getLocationById(locationId)).organizationId
        const user = res.locals.connectedUser.admin as AdminProfile
        if (!user.adminForOrganizationId?.includes(orgId)) {
          throw new UnauthorizedException(`Not an admin for organization ${orgId}`)
        }
      }

      const responseBody = await this.statsHelper(organizationId, locationId)
      const authenticatedUser = res.locals.connectedUser as User
      res.json(actionSucceed(responseBody, authenticatedUser.id))
    } catch (error) {
      next(error)
    }
  }

  private statsHelper = async (
    organizationId?: string,
    locationId?: string,
  ): Promise<AccessStats> => {
    // Check parameters
    if ((!organizationId && !locationId) || (!!organizationId && !!locationId))
      throw new BadRequestException('Organization or Location is required')

    //TODO: Assert admin can access that location

    // Get all locations
    const locationIds = organizationId
      ? (await this.organizationService.getLocations(organizationId)).map((e) => e.id)
      : [locationId]

    const asOfDateTime = new Date().toISOString()
    const stats = await this.accessService.getTodayStatsForLocations(locationIds)
    const checkInsPerHour = fakeCheckInsPerHour()
    return {..._.omit(stats, ['id', 'createdAt']), asOfDateTime, checkInsPerHour}
  }

  enter = async (req: Request, res: Response, next: NextFunction): Promise<unknown> => {
    try {
      const {accessToken, userId} = req.body
      const access = await this.accessService.findOneByToken(accessToken)
      const passport = await this.passportService.findOneByToken(access.statusToken)
      const user = await this.userService.findOne(userId)

      const {organizationId, ...location} = await this.organizationService.getLocationById(
        access.locationId,
      )

      if (!location.allowAccess) {
        throw new BadRequestException('Location does not permit direct check-in')
      }
      if (userId !== access.userId) {
        // TODO: we could remove userId from this request
        throw new UnauthorizedException(`Access ${accessToken} does not belong to ${userId}`)
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

      const canEnter =
        passport.status === PassportStatuses.Pending ||
        (passport.status === PassportStatuses.Proceed && !isPassed(passport.validUntil))

      if (canEnter) {
        const newAccess = await this.accessService.handleEnter(access)
        const {dependants} = newAccess
        const userIdToReturn = newAccess.userId
        const userModelToReturn =
          userIdToReturn === userId
            ? user
            : {
                ...user,
                id: userIdToReturn,
                firstName: dependants.find(({id}) => id === userIdToReturn)?.firstName,
                lastName: dependants.find(({id}) => id === userIdToReturn)?.lastName,
              }
        const responseBody = {
          passport,
          base64Photo: user.base64Photo,
          dependants: [],
          includesGuardian: access.includesGuardian,
          firstName: user.firstName,
          lastName: user.lastName,
          access: {
            ...newAccess,
            status: passport.status,
            user: userModelToReturn,
          },
        }
        return res.json(actionSucceed({...responseBody, dependants}))
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
      const includesGuardian = access.includesGuardian
      // if unspecified, all remaining dependents

      const passport = await this.passportService.findOneByToken(access.statusToken)
      const user = await this.userService.findOne(userId)
      if (userId !== access.userId) {
        throw new UnauthorizedException(`Access ${accessToken} does not belong to ${userId}`)
      }
      const newAccess = await this.accessService.handleExit(access)
      const {dependants} = newAccess
      const userIdToReturn = newAccess.userId
      const userModelToReturn =
        userIdToReturn === userId
          ? user
          : {
              ...user,
              id: userIdToReturn,
              firstName: dependants.find(({id}) => id === userIdToReturn)?.firstName,
              lastName: dependants.find(({id}) => id === userIdToReturn)?.lastName,
            }
      const responseBody = {
        passport,
        base64Photo: user.base64Photo,
        dependants,
        includesGuardian,
        firstName: user.firstName,
        lastName: user.lastName,
        access: {
          ...newAccess,
          status: passport.status,
          user: userModelToReturn,
        },
      }
      res.json(actionSucceed(responseBody))
    } catch (error) {
      next(error)
    }
  }

  enterOrExitUsingATag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get request inputs
      const {tagId, locationId} = req.body

      // Get tag appropriately
      // Fix: Ticket #1035
      // Note: there's a bug that legacy mode is always passed through as true... so must try both
      let tag = await this.tagService.getByLegacyId(tagId)
      if (!tag) {
        tag = await this.tagService.getById(tagId)
      }
      if (!tag) {
        throw new ResourceNotFoundException(`NFC Tag not found`)
      }

      // Save org
      const organizationId = tag.organizationId

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
      const latestPassport = await this.passportService.findLatestPassport(
        tag.userId,
        parentUserId,
        null,
        organizationId,
      )
      const authorizedUserIds = new Set(latestPassport?.dependantIds ?? [])
      if (latestPassport?.includesGuardian) {
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

        const accessForEntering = await this.accessService.handleEnter(accessToken)
        res.json(actionSucceed(accessForEntering))
      } else {
        // Get Latest Passport (as they need a valid access)
        const specificPassport = await this.passportService.findOneByToken(access.statusToken)
        const specificAuthorizedUserIds = new Set(specificPassport?.dependantIds ?? [])
        if (specificPassport?.includesGuardian) {
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
          ? await this.accessService.handleExit(access)
          : await this.accessService.handleEnter(access)

        res.json(actionSucceed(accessForEnteringOrExiting))
      }
    } catch (error) {
      next(error)
    }
  }

  getAccessibleLocations = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {organizationId} = req.body
      const {userId} = req.query

      // TODO: Get locations that have the same questionaire id as the location id in the status token

      // Get all status tokens
      // const statusTokens = await this.passportService.findByValidity(userId as string | null)

      res.json(actionSucceed({organizationId, userId}))
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

      // Check access permissions
      const {organizationId} = await this.organizationService.getLocationById(locationId)
      const authenticatedUser = res.locals.connectedUser as User
      const admin = authenticatedUser.admin as AdminProfile
      const isSuperAdmin = admin.superAdminForOrganizationIds?.includes(organizationId)
      const canAccessOrganization = isSuperAdmin || admin.adminForOrganizationId === organizationId

      // Double check
      if (!canAccessOrganization) {
        replyInsufficientPermission(res)
        return
      }

      // Get access
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
}

const nowPlusHour = (amount = 1) => moment(now()).tz(timeZone).startOf('day').add(amount, 'hours')

const fakeCheckInsPerHour = () => [
  {date: nowPlusHour(7), count: 0},
  {date: nowPlusHour(8), count: 5},
  {date: nowPlusHour(9), count: 50},
  {date: nowPlusHour(10), count: 200},
  {date: nowPlusHour(11), count: 212},
  {date: nowPlusHour(12), count: 190},
  {date: nowPlusHour(13), count: 110},
]

export default AdminController
