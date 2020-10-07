import {NextFunction, Request, Response, Router} from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed, of} from '../../../common/src/utils/response-wrapper'
import {
  Organization,
  OrganizationGroup,
  OrganizationLocation,
  OrganizationUsersGroup,
  OrganizationUsersGroupMoveOperation,
  OrganizationReminderSchedule,
} from '../models/organization'
import {OrganizationService} from '../services/organization-service'
import {HttpException} from '../../../common/src/exceptions/httpexception'
import {User, UserDependant} from '../../../common/src/data/user'
import {ResponseStatusCodes} from '../../../common/src/types/response-status'
import {UserService} from '../../../common/src/service/user/user-service'
import {AccessService} from '../../../access/src/service/access.service'
import {AttestationService} from '../../../passport/src/services/attestation-service'
import moment from 'moment'
import {Access, AccessWithPassportStatusAndUser} from '../../../access/src/models/access'
import {PassportService} from '../../../passport/src/services/passport-service'
import {Passport, PassportStatus, PassportStatuses} from '../../../passport/src/models/passport'
import {CheckInsCount} from '../../../access/src/models/access-stats'
import {Stats, StatsFilter} from '../models/stats'
import {FamilyStatusReportRequest, UserContactTraceReportRequest} from '../types/trace-request'
import {Range} from '../../../common/src/types/range'
import * as _ from 'lodash'
import {flattern} from '../../../common/src/utils/utils'
import {authMiddleware} from '../../../common/src/middlewares/auth'
import {AdminProfile} from '../../../common/src/data/admin'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {now} from '../../../common/src/utils/times'

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
  private attestationService = new AttestationService()

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
        .delete('/:groupId', this.removeGroup)
        .delete('/:groupId/users/:userId', this.removeUserFromGroup),
    )
    // prettier-ignore
    const stats = innerRouter().use(
      '/stats',
      authMiddleware,
      innerRouter()
        .get('/', this.getStatsInDetailForGroupsOrLocations)
        .get('/health', this.getStatsHealth)
        .get('/contact-trace-locations', this.getUserContactTraceLocations)
        .get('/contact-traces', this.getUserContactTraces)
        .get('/contact-trace-attestations', this.getUserContactTraceAttestations)
        .get('/family', this.getFamilyStats)
    )
    const organizations = Router().use(
      '/organizations',
      Router().post('/', this.create), // TODO: must be a protected route
      Router().post('/:organizationId/scheduling', this.updateReportInfo), // TODO: must be a protected route
      Router().get('/one', this.findOneByKeyOrId),
      Router().use('/:organizationId', locations, groups, stats),
      Router().get('/:organizationId/config', this.getOrgConfig),
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
    const dayShift = req.body.dayShift ?? 0

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

  findOneByKeyOrId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {key, id} = req.query as {key?: string; id?: string}

      // Further validation
      if ((!key && !id) || (!!key && !!id))
        throw new BadRequestException('Key or Id is required independently')

      const organization = !!key
        ? await this.organizationService.findOrganizationByKey(parseInt(key))
        : await this.organizationService.findOneById(id)
      res.json(actionSucceed(organization))
    } catch (error) {
      next(error)
    }
  }

  getOrgConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId} = req.params
      const organization = await this.organizationService.findOneById(organizationId)
      const response: OrganizationReminderSchedule = {
        enabled: organization?.dailyReminder?.enabled ?? false,
        enabledOnWeekends: organization?.dailyReminder?.enabledOnWeekends ?? false,
        timeOfDayMillis: organization?.dailyReminder?.timeOfDayMillis ?? 0,
      }

      res.json(actionSucceed(response))
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

  getStatsInDetailForGroupsOrLocations = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {organizationId} = req.params
      const {groupId, locationId, from, to} = req.query as StatsFilter

      const authenticatedUser = res.locals.connectedUser as User
      const admin = authenticatedUser.admin as AdminProfile
      const isSuperAdmin = admin.superAdminForOrganizationIds?.includes(organizationId)
      const isHealthAdmin = admin.healthAdminForOrganizationIds?.includes(organizationId)
      const canAccessOrganization = isSuperAdmin || admin.adminForOrganizationId === organizationId

      if (!canAccessOrganization) replyInsufficientPermission(res)

      // If group is specified, make sure we are group admin
      if (groupId) {
        const hasGrantedPermission = isSuperAdmin || admin.adminForGroupIds?.includes(groupId)
        if (!hasGrantedPermission) replyInsufficientPermission(res)
        // Assert group exists
        await this.organizationService.getGroup(organizationId, groupId)
      }

      // If location is specified, make sure we are location admin
      if (locationId) {
        const hasGrantedPermission = isSuperAdmin || admin.adminForLocationIds?.includes(locationId)
        if (!hasGrantedPermission) replyInsufficientPermission(res)
        // Assert location exists
        await this.organizationService.getLocation(organizationId, locationId)
      }

      // If no group and no location is specified, make sure we are the health admin
      if (!groupId && !locationId && !isHealthAdmin) {
        replyInsufficientPermission(res)
      }

      const response = await this.getStatsHelper(organizationId, {groupId, locationId, from, to})

      res.json(actionSucceed(response))
    } catch (error) {
      next(error)
    }
  }

  getStatsHealth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId} = req.params
      const {groupId, locationId, from, to} = req.query as StatsFilter

      const authenticatedUser = res.locals.connectedUser as User
      const admin = authenticatedUser.admin as AdminProfile
      const isSuperAdmin = admin.superAdminForOrganizationIds?.includes(organizationId)
      const isHealthAdmin = admin.healthAdminForOrganizationIds?.includes(organizationId)
      const canAccessOrganization =
        isSuperAdmin || isHealthAdmin || admin.adminForOrganizationId === organizationId

      if (!canAccessOrganization) replyInsufficientPermission(res)

      const response = await this.getStatsHelper(organizationId, {groupId, locationId, from, to})

      const accesses = response.accesses.filter(
        (access) =>
          access.status === PassportStatuses.Caution || access.status === PassportStatuses.Stop,
      )

      res.json(
        actionSucceed({
          permissionToViewDetail: !!isHealthAdmin,
          asOfDateTime: response.asOfDateTime,
          passportsCountByStatus: response.passportsCountByStatus,
          hourlyCheckInsCounts: response.hourlyCheckInsCounts,
          ...(!!isHealthAdmin && {accesses}),
        }),
      )
    } catch (error) {
      next(error)
    }
  }

  private async getStatsHelper(organizationId: string, filter?: StatsFilter): Promise<Stats> {
    const {groupId, locationId, from, to} = filter ?? {}
    const live = !from && !to

    const betweenCreatedDate = {
      from: live ? moment(now()).startOf('day').toDate() : new Date(from),
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
    const dependantsById = await this.getDependantsById([...guardianIds], usersById, dependantIds)

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

    // Get accesses
    const accesses = await this.getAccessesFor(
      [...userIds],
      [...dependantIds],
      locationId,
      groupId,
      betweenCreatedDate,
      groupsUsersByUserId,
      usersById,
      dependantsById,
    )

    return {
      accesses,
      asOfDateTime: live ? now().toISOString() : null,
      passportsCountByStatus: getPassportsCountPerStatus(accesses),
      hourlyCheckInsCounts: getHourlyCheckInsCounts(accesses),
    } as Stats
  }

  getUserContactTraceLocations = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {organizationId} = req.params
      const {userId, parentUserId, from, to} = req.query as UserContactTraceReportRequest

      let isParentUser = true
      let accesses: Access[]

      if (parentUserId) {
        const user = await this.userService.findOne(parentUserId)
        if (user && user.organizationIds.indexOf(organizationId) > -1) {
          isParentUser = false
        }
      }

      const live = !from && !to

      const betweenCreatedDate = {
        from: live ? moment(now()).startOf('day').toDate() : new Date(from),
        to: live ? undefined : new Date(to),
      }

      if (isParentUser) {
        accesses = await this.accessService.findAllWith({
          userIds: [userId],
          betweenCreatedDate,
        })
      } else {
        accesses = await this.accessService.findAllWithDependents({
          userId: parentUserId,
          dependentId: userId,
          betweenCreatedDate,
        })
      }

      const accessLocationIds: string[] = accesses.map((item: Access) => item.locationId)

      const locations: OrganizationLocation[] = await this.organizationService.getLocations(
        organizationId,
      )

      const accessedLocations: OrganizationLocation[] = locations.filter(
        (location: OrganizationLocation) => accessLocationIds.indexOf(location.id) > -1,
      )

      res.json(actionSucceed(accessedLocations))
    } catch (error) {
      next(error)
    }
  }

  getUserContactTraces = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId} = req.params
      const {userId, parentUserId, from, to} = req.query as UserContactTraceReportRequest

      let isParentUser = true

      if (parentUserId) {
        const user = await this.userService.findOne(parentUserId)
        if (user && user.organizationIds.indexOf(organizationId) > -1) {
          isParentUser = false
        }
      }

      // fetch exposures in the time period
      const rawExposures = await this.attestationService.getExposuresInPeriod(
        isParentUser ? userId : parentUserId,
        from,
        to,
      )

      // ids of all the users we need more information about
      // dependant info is already included in the trace
      const allUserIds = new Set<string>()
      const allDependantIds = new Set<string>()
      rawExposures.forEach(({exposures}) =>
        exposures.forEach((exposure) => {
          exposure.overlapping.forEach((overlap) => {
            allUserIds.add(overlap.userId)
            if (overlap.dependant) {
              allDependantIds.add(overlap.dependant.id)
            }
          })
        }),
      )

      // N queries
      const statuses = await Promise.all(
        [...allDependantIds, ...allUserIds].map(
          async (id): Promise<{id: string; status: PassportStatus}> => ({
            id,
            status: await this.attestationService.latestStatus(id),
          }),
        ),
      )

      const statusLookup: Record<string, PassportStatus> = statuses.reduce(
        (lookup, curr) => ({...lookup, [curr.id]: curr.status}),
        {},
      )

      const allUsers = await this.userService.findAllBy({userIds: [...allUserIds]})
      const usersById: Record<string, User> = allUsers.reduce(
        (lookup, user) => ({...lookup, [user.id]: user}),
        {},
      )
      // every group this organization contains
      const allGroups = await this.organizationService.getGroups(organizationId)
      const groupsById: Record<string, OrganizationGroup> = allGroups.reduce(
        (lookup, group) => ({...lookup, [group.id]: group}),
        {},
      )

      // group memberships for all the users we're interested in
      const userGroups = await this.organizationService.getUsersGroups(organizationId, null, [
        ...allUserIds,
      ])
      const groupsByUserId: Record<string, OrganizationGroup> = userGroups.reduce(
        (lookup, groupLink) => ({...lookup, [groupLink.userId]: groupsById[groupLink.groupId]}),
        {},
      )

      // WARNING: adding properties to models may not cause them to appear here
      const result = rawExposures.map(({date, duration, exposures}) => ({
        date,
        duration,
        exposures: exposures.map(({overlapping, date, organizationId, locationId}) => ({
          date,
          organizationId,
          locationId,
          overlapping: overlapping.map(({userId, dependant, start, end}) => ({
            userId,
            status: statusLookup[userId] ?? PassportStatuses.Pending,
            group: groupsByUserId[userId],
            firstName: usersById[userId].firstName,
            lastName: usersById[userId].lastName,
            base64Photo: usersById[userId].base64Photo,
            // @ts-ignore this is a firestore timestamp, not a string
            start: start?.toDate() ?? null,
            // @ts-ignore this is a firestore timestamp, not a string
            end: end?.toDate() ?? null,
            dependant: dependant
              ? {
                  id: dependant.id,
                  firstName: dependant.firstName,
                  lastName: dependant.lastName,
                  group: groupsById[dependant.groupId],
                  status: statusLookup[dependant.id] ?? PassportStatuses.Pending,
                }
              : null,
          })),
        })),
      }))
      res.json(actionSucceed(result))
    } catch (error) {
      next(error)
    }
  }

  getUserContactTraceAttestations = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // const {organizationId} = req.params
      const {userId, from, to} = req.query as UserContactTraceReportRequest

      // fetch attestation array in the time period
      const attestations = await this.attestationService.getAttestationsInPeriod(userId, from, to)
      // @ts-ignore 'timestamps' does not exist in typescript
      const response = attestations.map(({timestamps, attestationTime, ...passThrough}) => ({
        ...passThrough,
        // @ts-ignore attestationTime is a server timestamp, not a string
        attestationTime: attestationTime.toDate(),
      }))
      res.json(actionSucceed(response))
    } catch (error) {
      next(error)
    }
  }

  getFamilyStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId} = req.params
      const {userId, parentUserId} = req.query as FamilyStatusReportRequest

      let isParentUser = true

      if (parentUserId) {
        const user = await this.userService.findOne(parentUserId)
        if (user && user.organizationIds.indexOf(organizationId) > -1) {
          isParentUser = false
        }
      }

      const parent = await this.userService.findOne(isParentUser ? userId : parentUserId)
      const parentGroup = await this.organizationService.getUserGroup(
        organizationId,
        isParentUser ? userId : parentUserId,
      )

      const parentStatus = await this.attestationService.latestStatus(
        isParentUser ? userId : parentUserId,
      )

      const dependents = await this.userService.getAllDependants(
        isParentUser ? userId : parentUserId,
      )

      const dependentsWithGroup = await Promise.all(
        dependents.map(async (dependent: UserDependant) => {
          const group = await this.organizationService.getGroup(organizationId, dependent.groupId)
          const dependentStatus = await this.attestationService.latestStatus(dependent.id)

          return {
            ...dependent,
            groupName: group.name,
            status: dependentStatus,
          }
        }),
      )

      const response = {
        parent: {
          firstName: parent.firstName,
          lastName: parent.lastName,
          groupName: parentGroup.name,
          base64Photo: parent.base64Photo,
          status: parentStatus,
        },
        dependents: dependentsWithGroup,
      }

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
    usersById: Record<string, User>,
    dependantsByIds: Record<string, User>,
  ): Promise<AccessWithPassportStatusAndUser[]> {
    // Fetch passports
    const passportsByUserIds = await this.passportService.findTheLatestValidPassports(
      userIds,
      dependantIds,
    )
    const implicitPendingPassports = [...userIds, ...dependantIds]
      .filter((userId) => !passportsByUserIds[userId])
      .map((userId) => ({status: PassportStatuses.Pending, userId} as Passport))

    // Fetch accesses by status-token
    const proceedStatusTokens = Object.values(passportsByUserIds)
      .filter(({status}) => status === PassportStatuses.Proceed)
      .map(({statusToken}) => statusToken)
    const accessesByStatusToken: Record<string, Access> = await Promise.all(
      _.chunk(proceedStatusTokens, 10).map((chunk) =>
        this.accessService.findAllWith({
          statusTokens: chunk,
          locationId,
        }),
      ),
    )
      .then((results) => flattern(results as Access[][]))
      .then((results) =>
        results.reduce(
          (byStatusToken, access) => ({...byStatusToken, [access.statusToken]: access}),
          {},
        ),
      )

    const isAccessEligibleForUserId = (userId: string) =>
      !groupId || groupsByUserId[userId]?.groupId === groupId

    // Remap accesses
    const accesses = [...implicitPendingPassports, ...Object.values(passportsByUserIds)]
      .filter(({userId}) => isAccessEligibleForUserId(userId))
      .map(({userId, status, statusToken}) => {
        const user = usersById[userId] ?? dependantsByIds[userId]
        const parentUserId = passportsByUserIds[userId]?.parentUserId

        if (!user) {
          console.error(`Invalid state exception: Cannot find user/dependant for ID [${userId}]`)
          return null
        }
        const access = accessesByStatusToken[statusToken] ?? {
          token: null,
          statusToken: null,
          locationId: null,
          createdAt: null,
          enteredAt: null,
          exitAt: null,
          includesGuardian: null,
          dependants: null,
        }

        const dependants = access.dependants ?? {}
        return {
          ...access,
          userId,
          user,
          status,
          enteredAt: access.enteredAt ?? (dependants[userId]?.enteredAt as string) ?? null,
          exitAt: access.exitAt ?? (dependants[userId]?.exitAt as string) ?? null,
          parentUserId,
          groupId,
        }
      })
      .filter((access) => !!access)

    // Handle duplicates
    const distinctAccesses: Record<string, AccessWithPassportStatusAndUser> = {}
    const normalize = (s?: string): string => (!!s ? s.toLowerCase().trim() : '')
    accesses.forEach(({user, status, ...access}) => {
      if (!groupsByUserId[user.id]) {
        console.log('Invalid state: Cannot find group for user: ', user.id)
        return
      }

      const duplicateKey = `${normalize(user.firstName)}|${normalize(user.lastName)}|${
        groupsByUserId[user.id]?.groupId
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
    dependantIds?: Set<string>,
  ): Promise<Record<string, User>> {
    return Promise.all(
      parentUserIds.map((userId) =>
        this.userService
          .getAllDependants(userId)
          .then((results) =>
            results
              .filter(({id}) => dependantIds.has(id))
              .map((dependant) => ({...usersById[userId], ...dependant})),
          ),
      ),
    ).then((dependants) =>
      flattern(dependants).reduce((byId, dependant) => ({...byId, [dependant.id]: dependant}), {}),
    )
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
