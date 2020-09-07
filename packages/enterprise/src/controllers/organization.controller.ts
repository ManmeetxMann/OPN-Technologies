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
import moment from 'moment-timezone'
import {AccessWithPassportStatusAndUser} from '../../../access/src/models/access'
import {now} from '../../../common/src/utils/times'
import {PassportService} from '../../../passport/src/services/passport-service'
import {PassportStatus, PassportStatuses} from '../../../passport/src/models/passport'
import {CheckInsCount} from '../../../access/src/models/access-stats'
import {authMiddleware} from '../../../common/src/middlewares/auth'
import {Stats, StatsFilter} from '../models/stats'
import {Config} from '../../../common/src/utils/config'

const timeZone = Config.get('DEFAULT_TIME_ZONE')

import {performance} from 'perf_hooks'

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
      const groups = await this.organizationService.getGroups(organizationId).catch((error) => {
        throw new HttpException(error.message)
      })
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

      // Groups
      const groupsById: Record<string, OrganizationGroup> = group
        ? {[groupId]: group}
        : await this.organizationService
            .getGroups(organizationId)
            .then((results) => results.reduce((byId, group) => ({...byId, [group.id]: group}), {}))

      // Accesses
      const accesses = await this.organizationService
        .getUsersGroups(organizationId, groupId)
        .then(async (usersGroups = []) => {
          const userAccesses: AccessWithPassportStatusAndUser[] = []
          const getUsersAccessesT0 = performance.now()
          for (const {userId, groupId: currentGroupId, parentUserId} of usersGroups) {
            const currentGroup = groupsById[currentGroupId]
            if (!currentGroup.checkInDisabled) {
              const getUserAccessesT0 = performance.now()
              userAccesses.push(
                ...(await this.getAccessesFor(userId, parentUserId, locationId, from, to, live)),
              )
              const getUserAccessesT1 = performance.now()
              console.log(
                'Metrics: "get-one-user-accesses" time (ms):',
                getUserAccessesT1 - getUserAccessesT0,
              )
            }
          }
          const getUsersAccessesT1 = performance.now()
          console.log(
            'Metrics: "get-users-accesses" time (ms):',
            getUsersAccessesT1 - getUsersAccessesT0,
          )
          return userAccesses
        })

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

  private getAccessesFor(
    userId: string,
    parentUserId: string,
    locationId: string,
    from: string,
    to: string,
    live: boolean,
  ): Promise<AccessWithPassportStatusAndUser[]> {
    // This function takes for ever, mainly because the queries cannot be optimized
    // with a OR operator and a JOIN between collection, since firestore doesn't support these.
    // A way to optimize would be to build the stats event-based,
    // but we would still need to find out the pending users.
    const userPromise = parentUserId
      ? this.userService
          .getDependantAndParentByParentId(parentUserId, userId)
          .then(({parent, dependant}) => ({...dependant, base64Photo: parent.base64Photo} as User))
      : this.userService.findOneSilently(userId)

    return userPromise.then((user) => {
      if (!user) return []
      return this.accessService
        .findAllWith({
          userId,
          locationId,
          betweenCreatedDate: {
            from: live ? moment(now()).tz(timeZone).startOf('day').toDate() : new Date(from),
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
