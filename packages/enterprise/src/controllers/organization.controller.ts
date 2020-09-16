import {NextFunction, Request, Response, Router} from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed, of} from '../../../common/src/utils/response-wrapper'
import {
  Organization,
  OrganizationGroup,
  OrganizationLocation,
  OrganizationUsersGroup,
  OrganizationUsersGroupMoveOperation,
} from '../models/organization'
import {OrganizationService} from '../services/organization-service'
import {HttpException} from '../../../common/src/exceptions/httpexception'
import {User, UserDependant} from '../../../common/src/data/user'
import {ResponseStatusCodes} from '../../../common/src/types/response-status'
import {UserService} from '../../../common/src/service/user/user-service'
import {AccessService} from '../../../access/src/service/access.service'
import moment from 'moment'
import {Access, AccessWithPassportStatusAndUser} from '../../../access/src/models/access'
import {PassportService} from '../../../passport/src/services/passport-service'
import {Passport, PassportStatus, PassportStatuses} from '../../../passport/src/models/passport'
import {CheckInsCount} from '../../../access/src/models/access-stats'
import {Stats, StatsFilter} from '../models/stats'
import {Range} from '../../../common/src/types/range'
import * as _ from 'lodash'
import {flattern} from '../../../common/src/utils/utils'
import {authMiddleware} from '../../../common/src/middlewares/auth'
import {AdminProfile} from '../../../common/src/data/admin'

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
        .get('/', authMiddleware, this.getGroupsForAdmin)
        .get('/public', this.getGroupsForPublic)
        .put('/', this.updateMultipleUserGroup)
        .post('/users', this.addUsersToGroups)
        .put('/:groupId/users/:userId', this.updateUserGroup)
        .delete('/zombie-users', this.removeZombieUsersInGroups)
        .delete('/:groupId/', this.removeGroup)
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

  getGroupsForAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId} = req.params
      const groups = await this.getGroups(organizationId)

      const authenticatedUser = res.locals.connectedUser as User
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

  getGroupsForPublic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId} = req.params
      const groups = await this.getGroups(organizationId)
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

  updateUserGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId, groupId, userId} = req.params
      const {oldGroupId} = req.query
      await this.organizationService.updateGroupForUser(
        organizationId,
        oldGroupId as string,
        userId,
        groupId,
      )
      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }

  updateMultipleUserGroup = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {organizationId} = req.params
      const operation = req.body as OrganizationUsersGroupMoveOperation
      const output: string[] = []
      let counter = 0

      for (const change of operation.data) {
        const userId = change.userId
        const parentUserId = change.parentUserId
        const oldGroupId = change.oldGroupId
        const newGroupId = change.newGroupId
        const isMainUser = !parentUserId

        // In case we can't find one OR if it did it already
        try {
          // Get group name
          const newGroup = await this.organizationService.getGroup(organizationId, newGroupId)
          const oldGroup = await this.organizationService.getGroup(organizationId, oldGroupId)

          let userName = ''
          let parentName = ''
          const newGroupName = newGroup.name
          const oldGroupName = oldGroup.name

          // Get names
          if (!isMainUser) {
            const user = await this.userService.findOne(parentUserId)
            parentName = `${user.firstName} ${user.lastName}`
            const result = await this.userService.getDependantAndParentByParentId(
              parentUserId,
              userId,
            )
            userName = `${result.dependant.firstName} ${result.dependant.lastName}`
          } else {
            const user = await this.userService.findOne(userId)
            userName = `${user.firstName} ${user.lastName}`
          }

          // Output
          if (!isMainUser) {
            const message = `[${++counter}] Moving user "${userName}" with parent "${parentName}" from group "${oldGroupName}" to new group "${newGroupName}"`
            output.push(message)
            console.log(message)
          } else {
            const message = `[${++counter}] Moving user "${userName}" from group "${oldGroupName}" to new group "${newGroupName}"`
            output.push(message)
            console.log(message)
          }

          // Check if we should run
          if (!operation.dryRun) {
            await this.organizationService.updateGroupForUser(
              organizationId,
              oldGroupId,
              userId,
              newGroupId,
            )
          }
        } catch (error) {
          const message = `[${++counter}] Error on last operation... please investigate: userId: ${userId}, parent: ${parentUserId}, oldGroupId: ${oldGroupId}, newGroupId: ${newGroupId} : Error: ${
            error.message
          }`
          output.push(message)
          console.log(message)
        }
      }

      res.json(actionSucceed(output))
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

  removeGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId, groupId} = req.params
      // check for users in the group
      const usersInGroup = await this.organizationService.getUsersGroups(organizationId, groupId)
      if (usersInGroup.length) {
        console.warn(
          `Group ${groupId} of organization ${organizationId} has users ${usersInGroup.map(
            (user) => user.id,
          )}`,
        )
        throw new HttpException('This group has existing users', 403)
      }
      const adminsOfGroup = await this.userService.getAdminsForGroup(groupId)
      if (adminsOfGroup.length) {
        console.warn(
          `Group ${groupId} of organization ${organizationId} has admins ${adminsOfGroup.map(
            (user) => user.id,
          )}`,
        )
        throw new HttpException('This group has existing admins', 403)
      }
      await this.organizationService.deleteGroup(organizationId, groupId)
      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }

  removeZombieUsersInGroups = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {organizationId} = req.params
      const groups = await this.getGroups(organizationId)
      for (const group of groups) {
        const groupId = group.id
        const usersGroups = await this.organizationService.getUsersGroups(organizationId, groupId)
        for (const item of usersGroups) {
          let user: User | UserDependant = null
          const {id, userId, parentUserId} = item

          // If parent is not null then userId represents a dependent id
          if (parentUserId) {
            const dependants = await this.userService.getAllDependants(parentUserId)
            for (const dependant of dependants) {
              // Look for dependent
              if (dependant.id === userId) {
                user = dependant
                break
              }
              // FYI: we may have not found it and thus user = null
            }
          } else {
            user = await this.userService.findOneSilently(userId)
          }

          // Let's see if we need to delete the user group membership
          if (!user) {
            console.warn(
              `Deleting user-group [${id}] for user [${userId}] and [${parentUserId}] from group [${groupId}]`,
            )
            await this.organizationService.removeUserFromGroup(organizationId, groupId, userId)
          }
        }
      }

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
      const isSuperAdmin = admin.superAdminForOrganizationIds?.includes(organizationId)
      const canAccessOrganization = isSuperAdmin || admin.adminForOrganizationId === organizationId

      if (!canAccessOrganization) replyInsufficientPermission(res)

      if (groupId) {
        const hasGrantedPermission = isSuperAdmin || admin.adminForGroupIds?.includes(groupId)
        if (!hasGrantedPermission) replyInsufficientPermission(res)
        // Assert group exists
        await this.organizationService.getGroup(organizationId, groupId)
      }

      if (locationId) {
        const hasGrantedPermission = isSuperAdmin || admin.adminForLocationIds?.includes(locationId)
        if (!hasGrantedPermission) replyInsufficientPermission(res)
        // Assert location exists
        await this.organizationService.getLocation(organizationId, locationId)
      }

      const betweenCreatedDate = {
        from: live ? moment().startOf('day').toDate() : new Date(from),
        to: live ? undefined : new Date(to),
      }

      // Fetch user groups
      const usersGroups = await this.organizationService.getUsersGroups(organizationId, groupId)

      // Get users & dependants
      const nonGuardiansUserIds = new Set<string>()
      const guardianIds = new Set<string>()
      const dependantIds = new Set<string>()
      usersGroups.forEach(({userId, parentUserId}) => {
        if (!!parentUserId) {
          dependantIds.add(userId)
          guardianIds.add(parentUserId)
        } else nonGuardiansUserIds.add(userId)
      })
      const userIds = new Set([...nonGuardiansUserIds, ...guardianIds])
      const usersById = await this.getUsersById([...userIds])
      const dependantsById = await this.getDependantsById([...guardianIds], usersById, groupId)

      // Fetch Guardians groups
      const guardiansGroups: OrganizationUsersGroup[] = await Promise.all(
        _.chunk([...guardianIds], 10).map((chunk) =>
          this.organizationService.getUsersGroups(organizationId, null, chunk),
        ),
      ).then((results) => flattern(results as OrganizationUsersGroup[][]))

      const groupsUsersByUserId: Record<string, OrganizationUsersGroup> = [
        ...new Set([...(usersGroups ?? []), ...(guardiansGroups ?? [])]),
      ].reduce(
        (byUserId, groupUser) => ({
          ...byUserId,
          [groupUser.userId]: groupUser,
        }),
        {},
      )

      // Fetch Groups
      const groupsById: Record<
        string,
        OrganizationGroup
      > = await this.organizationService
        .getGroups(organizationId)
        .then((results) => results.reduce((byId, group) => ({...byId, [group.id]: group}), {}))

      // Get accesses
      const accesses = await this.getAccessesFor(
        [...userIds],
        [...dependantIds],
        locationId,
        groupId,
        betweenCreatedDate,
        groupsUsersByUserId,
        groupsById,
        usersById,
        dependantsById,
      )

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
    userIds: string[],
    dependantIds: string[],
    locationId: string | undefined,
    groupId: string | undefined,
    betweenCreatedDate: Range<Date>,
    groupsByUserId: Record<string, OrganizationUsersGroup>,
    groupsById: Record<string, OrganizationGroup>,
    usersById: Record<string, User>,
    dependantsByIds: Record<string, User>,
  ): Promise<AccessWithPassportStatusAndUser[]> {
    // Fetch passports
    const passportsByUserIds = await this.passportService.findLatestForUserIds(
      userIds,
      dependantIds,
    )
    const implicitPendingPassports = [...userIds, ...dependantIds]
      .filter((userId) => !passportsByUserIds[userId])
      .map((userId) => ({status: PassportStatuses.Pending, userId} as Passport))

    const groupOf = (userId: string): OrganizationGroup =>
      groupsById[groupsByUserId[userId]?.groupId]

    // Fetch accesses
    const accessesByStatusToken: Record<string, Access> = await this.fetchAccesses(
      userIds,
      locationId,
      betweenCreatedDate,
    ).then((results) =>
      results.reduce(
        (byStatusToken, access) => ({...byStatusToken, [access.statusToken]: access}),
        {},
      ),
    )

    const isAccessEligibleForUserId = (userId: string) =>
      !groupOf(userId)?.checkInDisabled && (!groupId || groupOf(userId)?.id === groupId)

    // Remap accesses
    const accesses = [...implicitPendingPassports, ...Object.values(passportsByUserIds)]
      .filter(({userId}) => isAccessEligibleForUserId(userId))
      .map(({id, userId, status, statusToken}) => {
        const user = usersById[userId] ?? dependantsByIds[userId]
        if (!user) {
          console.error(`Invalid state exception: Cannot find user/dependant for ID [${userId}]`)
          return null
        }
        const access =
          status === PassportStatuses.Proceed
            ? accessesByStatusToken[statusToken]
            : {
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

        if (!access) {
          console.error(
            `Invalid state exception: Cannot find access for status token [${statusToken}], passport [${id}] and user [${userId}]`,
          )
          return null
        }

        const dependants = access.dependants ?? {}
        return {
          ...access,
          userId,
          user,
          status,
          enteredAt: access.enteredAt ?? (dependants[userId]?.enteredAt as string) ?? null,
          exitAt: access.exitAt ?? (dependants[userId]?.exitAt as string) ?? null,
        }
      })
      .filter((access) => !!access)

    // Handle duplicates
    const distinctAccesses: Record<string, AccessWithPassportStatusAndUser> = {}
    accesses.forEach(({user, status, ...access}) => {
      if (!groupOf(user.id)) {
        console.log('That is not supposed to happened but...', user.id, groupsByUserId)
        return
      }

      const normalize = (s?: string): string => (!!s ? s.toLowerCase().trim() : '')
      const duplicateKey = `${normalize(user.firstName)}|${normalize(user.lastName)}|${
        groupOf(user.id)?.id
      }`
      const target = distinctAccesses[duplicateKey]

      if (!target || target.status === PassportStatuses.Pending) {
        distinctAccesses[duplicateKey] = {...access, user, status}
      }
    })
    return Object.values(distinctAccesses)
  }

  private getUsersById(userIds: string[]): Promise<Record<string, User>> {
    const chunks = _.chunk(userIds, 10) as string[][]
    return Promise.all(
      chunks.map((userIds) => this.userService.findAllBy({userIds})),
    ).then((results) =>
      results
        ?.reduce((flatted, chunks) => [...flatted, ...chunks], [])
        .reduce((byId, user) => ({...byId, [user.id]: user}), {}),
    )
  }

  private getDependantsById(
    parentUserIds: string[],
    usersById: Record<string, User>,
    groupId?: string,
  ): Promise<Record<string, User>> {
    return Promise.all(
      parentUserIds.map((userId) =>
        this.userService
          .getAllDependants(userId)
          .then((results) =>
            results
              .filter((dependant) => !groupId || dependant.groupId === groupId)
              .map((dependant) => ({...usersById[userId], ...dependant})),
          ),
      ),
    ).then((dependants) =>
      flattern(dependants).reduce((byId, dependant) => ({...byId, [dependant.id]: dependant}), {}),
    )
  }

  private fetchAccesses(
    userIds: string[],
    locationId: string | undefined,
    betweenCreatedDate: Range<Date>,
  ): Promise<Access[]> {
    return Promise.all(
      _.chunk(userIds, 10).map((chunk) =>
        this.accessService.findAllWith({
          userIds: chunk,
          locationId,
          betweenCreatedDate,
        }),
      ),
    ).then((results) => flattern(results as Access[][]))
  }

  private async getGroups(organizationId: string): Promise<OrganizationGroup[]> {
    const groups = await this.organizationService.getGroups(organizationId).catch((error) => {
      throw new HttpException(error.message)
    })
    groups.sort((a, b) => {
      // if a has higher priority, return a negative number (a comes first)
      const bias = (b.priority || 0) - (a.priority || 0)
      return bias || a.name.localeCompare(b.name, 'en', {numeric: true})
    })
    return groups
  }
}

export default OrganizationController
