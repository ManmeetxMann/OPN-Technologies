import * as express from 'express'
import {NextFunction, Request, Response} from 'express'
import IRouteController from '../../../../../common/src/interfaces/IRouteController.interface'
import {PassportService} from '../../../../../passport/src/services/passport-service'
import {OrganizationService} from '../../../../../enterprise/src/services/organization-service'
import {AccessService} from '../../../service/access.service'
import {actionFailed, actionSucceed, of} from '../../../../../common/src/utils/response-wrapper'
import {PassportStatuses} from '../../../../../passport/src/models/passport'
import {isPassed} from '../../../../../common/src/utils/datetime-util'
import {UserService} from '../../../../../common/src/service/user/user-service'
import {User} from '../../../../../common/src/data/user'
import {AdminProfile} from '../../../../../common/src/data/admin'
import {BadRequestException} from '../../../../../common/src/exceptions/bad-request-exception'
import {UnauthorizedException} from '../../../../../common/src/exceptions/unauthorized-exception'
import {ResourceNotFoundException} from '../../../../../common/src/exceptions/resource-not-found-exception'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'
import {now} from '../../../../../common/src/utils/times'
import moment from 'moment-timezone'
import * as _ from 'lodash'
import {Config} from '../../../../../common/src/utils/config'
import {AccessTokenService} from '../../../service/access-token.service'
import {ResponseStatusCodes} from '../../../../../common/src/types/response-status'
import {AccessStats} from '../../../models/access'
import {NfcTagService} from '../../../../../common/src/service/hardware/nfctag-service'
import {ForbiddenException} from '../../../../../common/src/exceptions/forbidden-exception'

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
      .post('/enterorexit/tag', requireAdminWithOrg, this.enterOrExitUsingATag)
      .get('/stats', requireAdminWithOrg, this.stats)
      // TODO: move to non-admin?
      .get('/:organizationId/locations/accessible', this.getAccessibleLocations)
    this.router.use('/access/admin', routes)
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
      const [passport, user, location] = await Promise.all([
        this.passportService.findOneByToken(access.statusToken),
        this.userService.findOne(userId),
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

      const {dependants, ...newAccess} = await this.accessService.handleEnter(access)
      const responseBody = {
        access: newAccess,
        passport,
        user,
        dependants,
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
      const [passport, user] = await Promise.all([
        this.passportService.findOneByToken(access.statusToken),
        this.userService.findOne(userId),
      ])
      const {dependants, ...newAccess} = await this.accessService.handleExit(access)
      const responseBody = {
        passport,
        dependants,
        access: newAccess,
        user,
      }
      res.json(actionSucceed(responseBody))
    } catch (error) {
      next(error)
    }
  }

  enter = async (req: Request, res: Response, next: NextFunction): Promise<unknown> => {
    // used when an admin scans an access token
    try {
      const {accessToken} = req.body
      const {organizationId} = res.locals
      const access = await this.accessService.findOneByToken(accessToken)
      const {locationId} = access
      const [passport, user] = await Promise.all([
        this.passportService.findOneByToken(access.statusToken),
        this.userService.findOne('userId'),
      ])

      const location = await this.organizationService.getLocation(organizationId, locationId)

      if (!location) {
        throw new ForbiddenException(
          `Location ${locationId} does not exist or does not belong to organization ${organizationId}`,
        )
      }
      if (!location.allowAccess) {
        throw new BadRequestException('Location does not permit direct check-in')
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
  exit = async (req: Request, res: Response, next: NextFunction): Promise<unknown> => {
    // used when an admin scans an access token
    try {
      const {accessToken} = req.body
      const {organizationId} = res.locals
      
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
      const latestPassport = await this.passportService.findLatestPassport(tag.userId, parentUserId)
      // Make sure it's valid
      if (
        !latestPassport ||
        ![parentUserId, tag.userId].includes(latestPassport.userId) ||
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

        // Make sure it's valid
        if (
          !specificPassport ||
          ![parentUserId, tag.userId].includes(latestPassport.userId) ||
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
}

export default AdminController
