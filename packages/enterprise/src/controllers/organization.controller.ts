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
import {Access, AccessWithPassportStatusAndUser} from '../../../access/src/models/access'
import {PassportService} from '../../../passport/src/services/passport-service'
import {Passport, PassportStatus, PassportStatuses} from '../../../passport/src/models/passport'
import {CheckInsCount} from '../../../access/src/models/access-stats'
import {authMiddleware} from '../../../common/src/middlewares/auth'
import {Stats, StatsFilter} from '../models/stats'
import {Range} from '../../../common/src/types/range'
import * as _ from 'lodash'

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
        .put('/', this.updateLocations)
        .get('/:locationId', this.getLocation),
    )
    const groups = innerRouter().use(
      '/groups',
      innerRouter()
        .post('/', this.addGroups)
        .get('/', this.getGroups)
        .get('/public', this.getGroups) // TODO: to be removed
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
      Router().post('/:organizationId/scheduling', this.updateReportInfo), // TODO: must be a protected route
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
    zones.sort((a, b) => a.title.localeCompare(b.title, 'en', {numeric: true}))
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

  updateReportInfo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const {organizationId} = req.params
    const hourToSendReport = req.body.hourToSendReport ?? null
    const dayShift = req.body.forYesterday ? 1 : 0

    if (hourToSendReport % 1) {
      res
        .status(400)
        .json(of(null, ResponseStatusCodes.ValidationError, 'Hour must be a whole number'))
      return
    }

    if (hourToSendReport < 0 || hourToSendReport > 23) {
      res
        .status(400)
        .json(
          of(null, ResponseStatusCodes.ValidationError, 'Hour must be between 0 and 23, inclusive'),
        )
      return
    }

    try {
      const org = await this.organizationService
        .updateReporting(organizationId, hourToSendReport, dayShift)
        .catch((error) => {
          throw new HttpException(error.message)
        })
      res.json(actionSucceed(org))
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

  updateLocations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const {organizationId} = req.params
    const locations = req.body as OrganizationLocation[]
    try {
      const updatableLocationIds = new Set<string>()
      await this.organizationService
        .getLocations(organizationId)
        .then((results) => results.forEach(({id}) => updatableLocationIds.add(id)))

      const updatedLocations = await this.organizationService.updateLocations(
        organizationId,
        locations.filter(({id}) => updatableLocationIds.has(id)),
      )

      res.json(actionSucceed(updatedLocations))
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

      locations.sort((a, b) => a.title.localeCompare(b.title, 'en', {numeric: true}))

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
      const groups = await this.organizationService.getGroups(organizationId).catch((error) => {
        throw new HttpException(error.message)
      })
      groups.sort((a, b) => a.name.localeCompare(b.name, 'en', {numeric: true}))
      res.json(actionSucceed(groups))
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

      let group: OrganizationGroup
      if (groupId) {
        const hasGrantedPermission = isSuperAdmin || admin.adminForGroupIds?.includes(groupId)
        if (!hasGrantedPermission) replyInsufficientPermission(res)
        // Assert group exists
        group = await this.organizationService.getGroup(organizationId, groupId)
      }

      if (locationId) {
        const hasGrantedPermission = isSuperAdmin || admin.adminForLocationIds.includes(locationId)
        if (!hasGrantedPermission) replyInsufficientPermission(res)
        // Assert location exists
        await this.organizationService.getLocation(organizationId, locationId)
      }

      // Fetch Groups
      const groupsById: Record<string, OrganizationGroup> = group
        ? {[groupId]: group}
        : await this.organizationService
            .getGroups(organizationId)
            .then((results) => results.reduce((byId, group) => ({...byId, [group.id]: group}), {}))

      // Fetch user groups
      const usersGroups = await this.organizationService.getUsersGroups(organizationId, groupId)

      // Get sharded accesses
      const shards: OrganizationUsersGroup[][] = _.chunk(usersGroups, 10)
      const betweenCreatedDate = {
        from: live ? moment().startOf('day').toDate() : new Date(from),
        to: live ? undefined : new Date(to),
      }
      const accesses = await Promise.all(
        shards.map((shard) =>
          this.getAccessesFor(shard, locationId, betweenCreatedDate, groupsById),
        ),
      ).then((results) => results.reduce((flatted, shard) => [...flatted, ...shard], []))

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

  private async getAccessesFor(
    usersGroups: OrganizationUsersGroup[],
    locationId,
    betweenCreatedDate: Range<Date>,
    groupsById: Record<string, OrganizationGroup>,
  ): Promise<AccessWithPassportStatusAndUser[]> {
    // Fetch users
    const groupsByUserId: Record<string, OrganizationUsersGroup> = (usersGroups ?? []).reduce(
      (byUserId, {userId, parentUserId, ...group}) => ({
        ...byUserId,
        [parentUserId ?? userId]: group,
      }),
      {},
    )
    const userIds = Object.keys(groupsByUserId)
    const usersById: Record<string, User> = await this.userService
      .findAllBy({userIds})
      .then((results) => results?.reduce((byId, user) => ({...byId, [user.id]: user}), {}))

    // Fetch dependants
    const dependantsByParentId: Record<string, User[]> = {}
    await Promise.all(
      userIds.map((userId) =>
        this.userService.getAllDependants(userId).then((results) => {
          dependantsByParentId[userId] = results.map((dependant) => ({
            ...usersById[userId],
            ...dependant,
          }))
        }),
      ),
    )

    // Fetch accesses
    const simpleAccesses: Access[] = await this.accessService.findAllWith({
      userIds,
      locationId,
      betweenCreatedDate,
    })

    // Fetch statuses
    const statusTokens = [...new Set(simpleAccesses.map(({statusToken}) => statusToken))]
    const statusesByToken: Record<string, PassportStatus> = await Promise.all(
      _.chunk(statusTokens, 10).map((shard) =>
        this.passportService.findAllBy({statusTokens: shard}),
      ) as Passport[][],
    ).then((results) =>
      results
        ?.reduce((flatted, shard) => [...flatted, ...shard], [])
        .reduce((byToken, {statusToken, status}) => ({...byToken, [statusToken]: status}), {}),
    )

    // Pending accesses
    const accessesByUserId = simpleAccesses.reduce(
      (byUserId, access) => ({...byUserId, [access.userId]: access}),
      {},
    )
    const pendingAccesses: AccessWithPassportStatusAndUser[] = userIds
      .filter((userId) => !accessesByUserId[userId] && !!usersById[userId])
      .map((userId) => pendingAccessForUser(usersById[userId]))

    // Augment accesses
    const augmentedAccesses: AccessWithPassportStatusAndUser[] = simpleAccesses
      .map(({userId, ...access}) => {
        const dependants = dependantsByParentId[userId]
        const mustCountGuardian = !groupsById[groupsByUserId[userId].groupId].checkInDisabled
        if (dependants?.length) {
          return (mustCountGuardian ? [...dependants, usersById[userId]] : dependants).map(
            (dependant) => ({
              ...access,
              userId,
              user: dependant,
              status: statusesByToken[access.statusToken],
            }),
          )
        }
        return [
          {
            ...access,
            userId,
            user: usersById[userId],
            status: statusesByToken[access.statusToken],
          },
        ]
      })
      .reduce((flatted, parts) => [...flatted, ...parts], [])

    return [...pendingAccesses, ...augmentedAccesses]
  }
}

export default OrganizationController
