import {NextFunction, Request, Response, Router} from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed, of} from '../../../common/src/utils/response-wrapper'
import {Organization, OrganizationGroup, OrganizationLocation} from '../models/organization'
import {OrganizationService} from '../services/organization-service'
import {HttpException} from '../../../common/src/exceptions/httpexception'
import {User} from '../../../common/src/data/user'
import {AdminProfile} from '../../../common/src/data/admin'
import {ResponseStatusCodes} from '../../../common/src/types/response-status'
import {UserService} from '../../../common/src/service/user/user-service'
import {AccessService} from '../../../access/src/service/access.service'
import moment from 'moment'
import {Access, AccessWithPassportStatus} from '../../../access/src/models/access'
import {PassportService} from '../../../passport/src/services/passport-service'
import {PassportStatus, PassportStatuses} from '../../../passport/src/models/passport'
import * as _ from 'lodash'
import {CheckInsCount} from '../../../access/src/models/access-stats'
import {authMiddleware} from '../../../common/src/middlewares/auth'

const pendingAccess: AccessWithPassportStatus = {
  status: PassportStatuses.Pending,
  token: null,
  statusToken: null,
  locationId: null,
  createdAt: null,
  enteredAt: null,
  exitAt: null,
  userId: null,
  includesGuardian: null,
  dependants: null,
}

const replyInsufficientPermission = (res: Response) =>
  res
    .status(403)
    .json(
      of(null, ResponseStatusCodes.AccessDenied, 'Insufficient permissions to fulfil the request'),
    )

const getHourlyCheckInsCounts = (accesses: AccessWithPassportStatus[]): CheckInsCount[] => {
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
  accesses: AccessWithPassportStatus[],
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
        .get('/', authMiddleware, this.getGroups)
        .get('/:groupId', authMiddleware, this.getGroup)
        .get('/:groupId/stats', authMiddleware, this.getGroupStats)
        .post('/:groupId/users', this.addUsersToGroup)
        .delete('/:groupId/users/:userId', this.removeUserFromGroup),
    )
    const organizations = Router().use(
      '/organizations',
      Router().post('/', this.create), // TODO: must be a protected route
      Router().use('/:organizationId', locations, groups),
    )

    this.router.use(organizations)
  }
  private populateZones = async (location: OrganizationLocation, organizationId: string) => {
    if (location.allowAccess || location.zones) {
      // location cannot have children
      return
    }
    const zones = await this.organizationService.getLocations(organizationId, location.id)
    location.zones = zones.map(({id, title, address}) => ({
      id,
      title,
      address,
    }))
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
      const adminGroupIds = (authenticatedUser.admin as AdminProfile).adminForGroupIds.reduce(
        (byId, id) => ({...byId, [id]: id}),
        {},
      )
      res.json(actionSucceed(groups.filter((group) => !!adminGroupIds[group.id])))
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

      return admin.adminForGroupIds.includes(group.id)
        ? res.json(actionSucceed(group))
        : replyInsufficientPermission(res)
    } catch (error) {
      next(error)
    }
  }

  addUsersToGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId, groupId} = req.params
      await this.organizationService.addUsersToGroup(organizationId, groupId, req.body as string[])

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

  getGroupStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId, groupId} = req.params
      const {from, to} = req.query
      const live = !from && !to
      const authenticatedUser = res.locals.connectedUser as User
      const admin = authenticatedUser.admin as AdminProfile
      const group = await this.organizationService.getGroup(organizationId, groupId)

      if (!admin.adminForGroupIds.includes(group.id)) replyInsufficientPermission(res)

      const asOfDateTime = live ? new Date().toISOString() : null

      // Users and accesses
      const {users, accessesByUserId} = await this.organizationService
        .getUsersGroups(organizationId, groupId)
        .then(async (usersGroups) => {
          const users: User[] = []
          const accessesByUserId: Record<string, AccessWithPassportStatus[]> = {}
          for (const {userId} of usersGroups) {
            const user = await this.userService.findOneSilently(userId)

            if (!!user) {
              users.push(user)
              accessesByUserId[userId] = await this.getAccessesForUserId(
                userId,
                new Date(from as string),
                new Date(to as string),
                live,
              )
            }
          }
          return {users, accessesByUserId}
        })

      // Passport count
      const allAccesses = _.flattenDeep(Object.values(accessesByUserId))
      const passportsCountByStatus = getPassportsCountPerStatus(allAccesses)

      // Check-ins per hour
      const hourlyCheckInsCounts = getHourlyCheckInsCounts(allAccesses)

      const response = {
        group,
        asOfDateTime,
        users,
        accessesByUserId,
        passportsCountByStatus,
        hourlyCheckInsCounts,
      }

      res.json(actionSucceed(response))
    } catch (error) {
      next(error)
    }
  }

  private mapAccessWithPassportStatus(access: Access): Promise<AccessWithPassportStatus> {
    return this.passportService
      .findOneByToken(access.statusToken)
      .then(({status}) => ({...access, status}))
  }

  private getAccessesForUserId(
    userId: string,
    from: Date,
    to: Date,
    live: boolean,
  ): Promise<AccessWithPassportStatus[]> {
    return this.accessService
      .findAllByUserIdAndCreatedAtRange(userId, {
        from: live ? moment().startOf('day').toDate() : from,
        to: live ? undefined : to,
      })
      .then((accesses) =>
        accesses.length === 0
          ? [pendingAccess]
          : Promise.all(accesses.map((access) => this.mapAccessWithPassportStatus(access))),
      )
  }
}

export default OrganizationController
