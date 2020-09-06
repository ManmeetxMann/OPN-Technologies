import {NextFunction, Request, Response, Router} from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed, of} from '../../../common/src/utils/response-wrapper'
import {
  Organization,
  OrganizationGroup,
  OrganizationLocation,
  OrganizationUsersGroup,
} from '../models/organization'
import {OrganizationService} from '../services/organization-service'
import {HttpException} from '../../../common/src/exceptions/httpexception'
import {User} from '../../../common/src/data/user'
import {AdminProfile} from '../../../common/src/data/admin'
import {ResponseStatusCodes} from '../../../common/src/types/response-status'
import {UserService} from '../../../common/src/service/user/user-service'
import {AccessService} from '../../../access/src/service/access.service'
import moment from 'moment'
import {AccessWithPassportStatusAndUser} from '../../../access/src/models/access'
import {PassportService} from '../../../passport/src/services/passport-service'
import {PassportStatus, PassportStatuses} from '../../../passport/src/models/passport'
import {CheckInsCount} from '../../../access/src/models/access-stats'
import {authMiddleware} from '../../../common/src/middlewares/auth'
import {Stats, StatsFilter} from '../models/stats'

const pendingAccessForUser = (user: User): AccessWithPassportStatusAndUser => ({
  status: PassportStatuses.Pending,
  user,
  token: null,
  statusToken: null,
  locationId: null,
  createdAt: null,
  enteredAt: null,
  exitAt: null,
  userId: null,
  includesGuardian: null,
  dependants: null,
})

const replyInsufficientPermission = (res: Response) =>
  res
    .status(403)
    .json(
      of(null, ResponseStatusCodes.AccessDenied, 'Insufficient permissions to fulfil the request'),
    )

const getHourlyCheckInsCounts = (accesses: AccessWithPassportStatusAndUser[]): CheckInsCount[] => {
  const countsPerHour: Record<string, number> = {}
  for (const {enteredAt} of accesses) {
    if (enteredAt) {
      const targetedHour = moment(enteredAt).startOf('hour').toISOString()
      countsPerHour[targetedHour] = (countsPerHour[targetedHour] ?? 0) + 1
    }
  }
  return Object.entries(countsPerHour)
    .sort(([date1], [date2]) => Date.parse(date1) - Date.parse(date2))
    .map(([date, count]) => ({date, count}))
}

const getPassportsCountPerStatus = (
  accesses: AccessWithPassportStatusAndUser[],
): Record<PassportStatus, number> =>
  accesses
    .map(({status}) => status)
    .reduce((byStatus, status) => ({...byStatus, [status]: byStatus[status] + 1}), {
      [PassportStatuses.Pending]: 0,
      [PassportStatuses.Proceed]: 0,
      [PassportStatuses.Caution]: 0,
      [PassportStatuses.Stop]: 0,
    })

class OrganizationController implements IControllerBase {
  public router = Router()
  private organizationService = new OrganizationService()
  private userService = new UserService()
  private accessService = new AccessService()
  private passportService = new PassportService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = () => Router({mergeParams: true})

    const locations = innerRouter().use(
      '/locations',
      innerRouter()
        .post('/', this.addLocations) // TODO: must be a protected route
        .get('/', this.getLocations)
        .get('/:locationId', this.getLocation),
    )
    const groups = innerRouter().use(
      '/groups',
      innerRouter()
        .post('/', this.addGroups)
        .get('/', this.getGroups)
        .get('/public', this.getGroupsPublic)
        .get('/:groupId', authMiddleware, this.getGroup)
        .post('/users', this.addUsersToGroups)
        .delete('/:groupId/users/:userId', this.removeUserFromGroup),
    )
    // prettier-ignore
    const stats = innerRouter().use(
      '/stats',
      authMiddleware,
      innerRouter().get('/', this.getStats),
    )
    const organizations = Router().use(
      '/organizations',
      Router().post('/', this.create), // TODO: must be a protected route
      Router().get('/one', this.findOneByKey),
      Router().use('/:organizationId', locations, groups, stats),
    )

    this.router.use(organizations)
  }
  private populateZones = async (location: OrganizationLocation, organizationId: string) => {
    if (location.allowAccess || location.zones) {
      // location cannot have children
      return
    }
    const zones = await this.organizationService.getLocations(organizationId, location.id)
    location.zones = zones.map(
      ({id, title, address, attestationRequired, questionnaireId, allowsSelfCheckInOut}) => ({
        id,
        title,
        address,
        attestationRequired,
        questionnaireId,
        allowsSelfCheckInOut,
      }),
    )
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organization = await this.organizationService
        .create(req.body as Organization)
        .catch((error) => {
          throw new HttpException(error.message)
        })
      res.json(actionSucceed(organization))
    } catch (error) {
      next(error)
    }
  }

  findOneByKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {key} = req.query as {key: string}
      const organization = await this.organizationService.findOrganizationByKey(parseInt(key))
      res.json(actionSucceed(organization))
    } catch (error) {
      next(error)
    }
  }

  addLocations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId} = req.params
      const {parentLocationId} = req.query
      const locations = await this.organizationService
        .addLocations(
          organizationId,
          req.body as OrganizationLocation[],
          parentLocationId as string | null,
        )
        .catch((error) => {
          throw new HttpException(error.message)
        })
      res.json(actionSucceed(locations))
    } catch (error) {
      next(error)
    }
  }

  getLocations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId} = req.params
      const {parentLocationId} = req.query
      const locations = await this.organizationService.getLocations(
        organizationId,
        parentLocationId as string | null,
      )
      await Promise.all(
        locations.map(async (location) => this.populateZones(location, organizationId)),
      )

      res.json(actionSucceed(locations))
    } catch (error) {
      next(error)
    }
  }

  getLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId, locationId} = req.params
      const location = await this.organizationService.getLocation(organizationId, locationId)
      await this.populateZones(location, organizationId)
      res.json(actionSucceed(location))
    } catch (error) {
      next(error)
    }
  }

  addGroups = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId} = req.params
      const groups = await this.organizationService.addGroups(
        organizationId,
        req.body as OrganizationGroup[],
      )
      res.json(actionSucceed(groups))
    } catch (error) {
      next(error)
    }
  }

  getGroups = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId} = req.params
      const authenticatedUser = res.locals.connectedUser as User
      const groups = await this.organizationService.getGroups(organizationId).catch((error) => {
        throw new HttpException(error.message)
      })
      const admin = authenticatedUser.admin as AdminProfile
      const adminGroupIds = (admin.adminForGroupIds ?? []).reduce(
        (byId, id) => ({...byId, [id]: id}),
        {},
      )
      res.json(actionSucceed(groups.filter((group) => !!adminGroupIds[group.id])))
    } catch (error) {
      next(error)
    }
  }

  getGroupsPublic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId} = req.params
      const groups = await this.organizationService.getGroups(organizationId).catch((error) => {
        throw new HttpException(error.message)
      })
      
      res.json(actionSucceed(groups))
    } catch (error) {
      next(error)
    }
  }

  getGroup = async (req: Request, res: Response, next: NextFunction): Promise<unknown> => {
    try {
      const {organizationId, groupId} = req.params
      const authenticatedUser = res.locals.connectedUser as User
      const admin = authenticatedUser.admin as AdminProfile
      const group = await this.organizationService.getGroup(organizationId, groupId)

      return admin.adminForGroupIds?.includes(group.id)
        ? res.json(actionSucceed(group))
        : replyInsufficientPermission(res)
    } catch (error) {
      next(error)
    }
  }

  addUsersToGroups = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId} = req.params
      const groups = req.body as OrganizationUsersGroup[]
      await Promise.all(
        groups.map(({groupId, userId, parentUserId}) =>
          this.organizationService.addUserToGroup(organizationId, groupId, userId, parentUserId),
        ),
      )

      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }

  removeUserFromGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId, groupId, userId} = req.params
      await this.organizationService.removeUserFromGroup(organizationId, groupId, userId)

      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }

  getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId} = req.params
      const {groupId, locationId, from, to} = req.query as StatsFilter
      const live = !from && !to
      const authenticatedUser = res.locals.connectedUser as User
      const admin = authenticatedUser.admin as AdminProfile
      const isSuperAdmin =
        admin.adminForOrganizationId === organizationId ||
        admin.superAdminForOrganizationIds.includes(organizationId)

      if (groupId) {
        const hasGrantedPermission = isSuperAdmin || admin.adminForGroupIds?.includes(groupId)
        if (!hasGrantedPermission) replyInsufficientPermission(res)
        // Assert group exists
        await this.organizationService.getGroup(organizationId, groupId)
      }

      if (locationId) {
        const hasGrantedPermission = isSuperAdmin || admin.adminForLocationIds.includes(locationId)
        if (!hasGrantedPermission) replyInsufficientPermission(res)
        // Assert location exists
        await this.organizationService.getLocation(organizationId, locationId)
      }

      // Accesses
      const accesses = await this.organizationService
        .getUsersGroups(organizationId, groupId)
        .then((usersGroups = []) =>
          Promise.all(
            usersGroups.map(({userId}) =>
              this.getAccessesForUser(userId, locationId, from, to, live),
            ),
          ),
        )
        .then((results) => results.reduce((all, byUsers) => [...all, ...byUsers], []))

      const response = {
        accesses,
        asOfDateTime: live ? new Date().toISOString() : null,
        passportsCountByStatus: getPassportsCountPerStatus(accesses),
        hourlyCheckInsCounts: getHourlyCheckInsCounts(accesses),
      } as Stats

      res.json(actionSucceed(response))
    } catch (error) {
      next(error)
    }
  }

  private getAccessesForUser(
    userId: string,
    locationId: string,
    from: string,
    to: string,
    live: boolean,
  ): Promise<AccessWithPassportStatusAndUser[]> {
    return this.userService.findOneSilently(userId).then((user) => {
      if (!user) return []
      return this.accessService
        .findAllWith({
          userId,
          locationId,
          betweenCreatedDate: {
            from: live ? moment().startOf('day').toDate() : new Date(from),
            to: live ? undefined : new Date(to),
          },
        })
        .then((targets) =>
          targets.length === 0
            ? [pendingAccessForUser(user)]
            : Promise.all(
                targets.map((access) =>
                  this.passportService
                    .findOneByToken(access.statusToken)
                    .then(({status}) => ({...access, status, user})),
                ),
              ),
        )
    })
  }
}

export default OrganizationController
