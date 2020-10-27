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
import {Config} from '../../../common/src/utils/config'
import {QuestionnaireService} from '../../../lookup/src/services/questionnaire-service'
import {Questionnaire} from '../../../lookup/src/models/questionnaire'

import template from '../templates/report'
import userTemplate from '../templates/user-report'
import {ExposureReport} from '../../../access/src/models/trace'
import {PdfService} from '../../../common/src/service/reports/pdf'

const timeZone = Config.get('DEFAULT_TIME_ZONE')

type AugmentedDependant = UserDependant & {group: OrganizationGroup; status: PassportStatus}
type Lookups = {
  usersLookup: Record<string, User>
  dependantsLookup: Record<string, AugmentedDependant>
  locationsLookup: Record<string, OrganizationLocation>
  groupsLookup: Record<string, OrganizationGroup>
  statusesLookup: Record<string, PassportStatus>
}

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

// select the 'fresher' access
const getPriorityAccess = (
  accessOne: AccessWithPassportStatusAndUser | null,
  accessTwo: AccessWithPassportStatusAndUser | null,
): AccessWithPassportStatusAndUser | null => {
  if (accessOne && !accessTwo) {
    return accessOne
  }
  if (accessTwo && !accessOne) {
    return accessTwo
  }
  // accessOne is still in the location but accessTwo is not
  if (accessOne.enteredAt && !accessOne.exitAt && (accessTwo.exitAt || !accessTwo.enteredAt)) {
    // but accessTwo is still more recent (accessTwo is 'stale')
    if (
      accessTwo.enteredAt &&
      new Date(accessTwo.enteredAt).getTime() > new Date(accessOne.enteredAt).getTime()
    ) {
      return accessTwo
    }
    return accessOne
  }
  // accessTwo is still in the location but accessOne is not
  if (accessTwo.enteredAt && !accessTwo.exitAt && (accessOne.exitAt || !accessOne.enteredAt)) {
    // but accessOne is still more recent (accessTwo is 'stale')
    if (
      accessOne.enteredAt &&
      new Date(accessOne.enteredAt).getTime() > new Date(accessTwo.enteredAt).getTime()
    ) {
      return accessOne
    }
    return accessTwo
  }
  if (new Date(accessOne.exitAt).getTime() > new Date(accessTwo.exitAt).getTime()) {
    return accessOne
  }
  if (new Date(accessTwo.exitAt).getTime() > new Date(accessOne.exitAt).getTime()) {
    return accessTwo
  }
  return accessOne
}

class OrganizationController implements IControllerBase {
  public router = Router()
  private organizationService = new OrganizationService()
  private userService = new UserService()
  private accessService = new AccessService()
  private passportService = new PassportService()
  private attestationService = new AttestationService()
  private questionnaireService = new QuestionnaireService()
  private pdfService = new PdfService()

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
        .get('/contact-trace-exposures', this.getUserContactTraceExposures)
        .get('/contact-trace-attestations', this.getUserContactTraceAttestations)
        .get('/family', this.getFamilyStats)
        .get('/report', this.getStatsReport)
        .get('/user-report', this.getUserReport)
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

      if (!canAccessOrganization) {
        replyInsufficientPermission(res)
        return
      }

      // If group is specified, make sure we are group admin
      if (groupId) {
        const hasGrantedPermission = isSuperAdmin || admin.adminForGroupIds?.includes(groupId)
        if (!hasGrantedPermission) {
          replyInsufficientPermission(res)
          return
        }
        // Assert group exists
        await this.organizationService.getGroup(organizationId, groupId)
      }

      // If location is specified, make sure we are location admin
      if (locationId) {
        const hasGrantedPermission = isSuperAdmin || admin.adminForLocationIds?.includes(locationId)
        if (!hasGrantedPermission) {
          replyInsufficientPermission(res)
          return
        }
        // Assert location exists
        await this.organizationService.getLocation(organizationId, locationId)
      }

      // If no group and no location is specified, make sure we are the health admin
      if (!groupId && !locationId && !isHealthAdmin) {
        replyInsufficientPermission(res)
        return
      }

      const response = await this.getStatsHelper(organizationId, {groupId, locationId, from, to})

      res.json(actionSucceed(response))
    } catch (error) {
      next(error)
    }
  }

  getUserReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId} = req.params
      const {userId: primaryId, parentUserId: secondaryId, from: queryFrom, to: queryTo} = req.query
      const authenticatedUser = res.locals.connectedUser as User
      const admin = authenticatedUser.admin as AdminProfile
      const isSuperAdmin = admin.superAdminForOrganizationIds?.includes(organizationId)
      const canAccessOrganization = isSuperAdmin || admin.adminForOrganizationId === organizationId

      const userId = (secondaryId || primaryId) as string
      const dependantId = secondaryId ? (primaryId as string) : null
      if (!canAccessOrganization) {
        replyInsufficientPermission(res)
        return
      }
      const organization = await this.organizationService.findOneById(organizationId)
      const to: string = (queryTo as string) ?? now().toISOString()
      const from: string =
        (queryFrom as string) ??
        moment(now()).tz(timeZone).startOf('day').subtract(2, 'days').toISOString()
      const [
        attestations,
        exposureTraces,
        userTraces,
        {enteringAccesses, exitingAccesses},
      ] = await Promise.all([
        this.attestationService.getAttestationsInPeriod(
          primaryId as string,
          from as string,
          to as string,
        ),
        this.attestationService.getExposuresInPeriod(
          primaryId as string,
          from as string,
          to as string,
        ),
        this.attestationService.getTracesInPeriod(
          userId,
          from as string,
          to as string,
          dependantId,
        ),
        this.getAccessHistory(
          from as string,
          to as string,
          primaryId as string,
          secondaryId as string,
        ),
      ])
      // sort by descending attestation time
      attestations.sort((a, b) =>
        new Date(a.attestationTime) < new Date(b.attestationTime) ? 1 : -1,
      )
      const userIds = new Set<string>([userId])
      const dependantIds = new Set<string>()
      if (dependantId) {
        dependantIds.add(dependantId)
      }
      // overlaps where the other user might have been sick
      const exposureOverlaps: ExposureReport['overlapping'] = []
      exposureTraces.forEach((trace) =>
        trace.exposures.forEach((exposure) =>
          exposure.overlapping.forEach((overlap) => {
            if (
              overlap.userId === userId &&
              (dependantId ? overlap.dependant?.id === dependantId : !overlap.dependant)
            ) {
              exposureOverlaps.push(overlap)
              userIds.add(overlap.sourceUserId)
              // no need to add dependant id to the lookup tables here, it's included in the trace
            }
          }),
        ),
      )
      // overlaps where this user might have been sick
      const traceOverlaps: ExposureReport['overlapping'] = []
      userTraces.forEach((trace) =>
        trace.exposures.forEach((exposure) =>
          exposure.overlapping.forEach((overlap) => {
            if (
              overlap.sourceUserId === userId &&
              (dependantId ? overlap.sourceDependantId === dependantId : !overlap.sourceDependantId)
            ) {
              traceOverlaps.push(overlap)
              userIds.add(overlap.userId)
              if (overlap.dependant) {
                userIds.add(overlap.dependant.id)
              }
            }
          }),
        ),
      )
      const lookups = await this.getLookups(userIds, dependantIds, organizationId)
      const {locationsLookup, usersLookup, dependantsLookup, groupsLookup} = lookups

      const questionnaireIds = new Set<string>()
      Object.values(locationsLookup).forEach((location) => {
        if (location.questionnaireId) {
          questionnaireIds.add(location.questionnaireId)
        } else {
          console.warn(`location ${location.id} does not include a questionnaireId`)
        }
      })
      const questionnaires = await Promise.all(
        [...questionnaireIds].map((id) => this.questionnaireService.getQuestionnaire(id)),
      )

      const questionnairesLookup: Record<number, Questionnaire> = questionnaires.reduce(
        (lookupSoFar, questionnaire) => {
          const count = Object.keys(questionnaire.questions).length
          if (lookupSoFar[count]) {
            console.warn(`Multiple questionnaires with ${count} questions`)
            return lookupSoFar
          }
          return {
            ...lookupSoFar,
            [count]: questionnaire,
          }
        },
        {},
      )

      const dateFormat = 'MMMM D, YYYY'
      const dateTimeFormat = 'h:mm A MMMM D, YYYY'

      const printableAccessHistory: {name: string; time: string; action: string}[] = []
      let enterIndex = 0
      let exitIndex = 0
      while (enterIndex < enteringAccesses.length || exitIndex < exitingAccesses.length) {
        let addExit = false
        if (enterIndex >= enteringAccesses.length) {
          addExit = true
        } else if (exitIndex >= exitingAccesses.length) {
          addExit = false
        } else {
          const entering = enteringAccesses[enterIndex]
          const exiting = exitingAccesses[exitIndex]
          const enterTime = new Date(
            // @ts-ignore dependant dates are actually strings
            dependantId ? entering.dependants[dependantId].enteredAt : entering.enteredAt,
          )
          const exitTime = new Date(
            // @ts-ignore dependant dates are actually strings
            dependantId ? exiting.dependants[dependantId].exitAt : exiting.exitAt,
          )
          if (enterTime > exitTime) {
            addExit = true
          }
        }
        if (addExit) {
          const access = exitingAccesses[exitIndex]
          const location = locationsLookup[access.locationId]
          const time = moment(
            //@ts-ignore dependant dates are actually strings
            dependantId ? access.dependants[dependantId].exitAt : access.exitAt,
          )
            .tz(timeZone)
            .format(dateTimeFormat)
          printableAccessHistory.push({
            name: location.title,
            time,
            action: 'Exit',
          })
          exitIndex += 1
        } else {
          const access = enteringAccesses[enterIndex]
          const location = locationsLookup[access.locationId]
          const time = moment(
            // @ts-ignore this is an ISO string
            dependantId ? access.dependants[dependantId].enteredAt : access.enteredAt,
          )
            .tz(timeZone)
            .format(dateTimeFormat)
          printableAccessHistory.push({
            name: location.title,
            time,
            action: 'Enter',
          })
          enterIndex += 1
        }
      }
      printableAccessHistory.reverse()
      exposureOverlaps.sort((a, b) => (a.start > b.start ? -1 : 1))
      traceOverlaps.sort((a, b) => (a.start > b.start ? -1 : 1))
      const printableExposures = exposureOverlaps.map((overlap) => ({
        firstName: overlap.dependant
          ? overlap.dependant.firstName
          : usersLookup[overlap.userId].firstName,
        lastName: overlap.dependant
          ? overlap.dependant.lastName
          : usersLookup[overlap.userId].lastName,
        groupName: groupsLookup[overlap.dependant?.id ?? overlap.userId]?.name ?? '',
        start: moment(overlap.start).tz(timeZone).format(dateTimeFormat),
        end: moment(overlap.end).tz(timeZone).format(dateTimeFormat),
      }))
      const printableTraces = traceOverlaps.map((overlap) => ({
        firstName: (overlap.sourceDependantId
          ? dependantsLookup[overlap.sourceDependantId]
          : usersLookup[overlap.sourceUserId]
        ).firstName,
        lastName: (overlap.sourceDependantId
          ? dependantsLookup[overlap.sourceDependantId]
          : usersLookup[overlap.sourceUserId]
        ).lastName,
        groupName: groupsLookup[overlap.sourceDependantId ?? overlap.sourceUserId]?.name ?? '',
        start: moment(overlap.start).tz(timeZone).format(dateTimeFormat),
        end: moment(overlap.end).tz(timeZone).format(dateTimeFormat),
      }))
      const printableAttestations = attestations.map((attestation) => {
        const answerKeys = Object.keys(attestation.answers)
        answerKeys.sort((a, b) => parseInt(a) - parseInt(b))
        const answerCount = answerKeys.length
        const questionnaire = questionnairesLookup[answerCount]
        if (!questionnaire) {
          console.warn(`no questionnaire found for attestation ${attestation.id}`)
        }
        return {
          responses: answerKeys.map((key) => {
            const yes = attestation.answers[key]['1']
            const dateOfTest =
              yes &&
              attestation.answers[key]['2'] &&
              moment(attestation.answers[key]['2']).tz(timeZone).format(dateFormat)
            return {
              question: (questionnaire?.questions[key]?.value ?? `Question ${key}`) as string,
              response: yes ? dateOfTest || 'Yes' : 'No',
            }
          }),
          // @ts-ignore timestamp, not string
          time: moment(attestation.attestationTime.toDate()).tz(timeZone).format(dateTimeFormat),
          status: attestation.status,
        }
      })
      const named = dependantId ? dependantsLookup[dependantId] : usersLookup[userId]
      // @ts-ignore we added a group id to users
      const group = groupsLookup[named.groupId]
      const namedGuardian = dependantId ? usersLookup[userId] : null
      // @ts-ignore
      const {content, tableLayouts} = userTemplate({
        attestations: printableAttestations,
        locations: printableAccessHistory,
        exposures: printableExposures,
        traces: printableTraces,
        organizationName: organization.name,
        userGroup: group.name,
        userName: `${named.firstName} ${named.lastName}`,
        guardianName: `${namedGuardian.firstName} ${namedGuardian.lastName}`,
        generationDate: moment(now()).tz(timeZone).format(dateFormat),
        reportDate: `${moment(from).tz(timeZone).format(dateFormat)} - ${moment(to)
          .tz(timeZone)
          .format(dateFormat)}`,
      })
      const stream = this.pdfService.generatePDFStream(content, tableLayouts)
      res.contentType('application/pdf')
      stream.pipe(res)
      res.status(200)
    } catch (error) {
      next(error)
    }
  }

  getStatsReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId} = req.params
      const {groupId, locationId, from, to} = req.query as StatsFilter

      const authenticatedUser = res.locals.connectedUser as User
      const admin = authenticatedUser.admin as AdminProfile
      const isSuperAdmin = admin.superAdminForOrganizationIds?.includes(organizationId)
      const isHealthAdmin = admin.healthAdminForOrganizationIds?.includes(organizationId)
      const canAccessOrganization = isSuperAdmin || admin.adminForOrganizationId === organizationId

      if (!canAccessOrganization) {
        replyInsufficientPermission(res)
        return
      }

      // If group is specified, make sure we are group admin
      if (groupId) {
        const hasGrantedPermission = isSuperAdmin || admin.adminForGroupIds?.includes(groupId)
        if (!hasGrantedPermission) {
          replyInsufficientPermission(res)
          return
        }
        // Assert group exists
        await this.organizationService.getGroup(organizationId, groupId)
      }

      // If location is specified, make sure we are location admin
      if (locationId) {
        const hasGrantedPermission = isSuperAdmin || admin.adminForLocationIds?.includes(locationId)
        if (!hasGrantedPermission) {
          replyInsufficientPermission(res)
          return
        }
        // Assert location exists
        await this.organizationService.getLocation(organizationId, locationId)
      }

      // If no group and no location is specified, make sure we are the health admin
      if (!groupId && !locationId && !isHealthAdmin) {
        replyInsufficientPermission(res)
        return
      }

      const statsObject = await this.getStatsHelper(organizationId, {groupId, locationId, from, to})
      // @ts-ignore
      const {content, tableLayouts} = template(statsObject)
      const pdfStream = this.pdfService.generatePDFStream(content, tableLayouts)
      res.contentType('application/pdf')
      pdfStream.pipe(res)
      res.status(200)
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

      if (!canAccessOrganization) {
        replyInsufficientPermission(res)
        return
      }

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

      const {enteringAccesses, exitingAccesses} = await this.getAccessHistory(
        from,
        to,
        userId,
        parentUserId,
      )

      const accessedLocationIds = new Set(
        [...enteringAccesses, ...exitingAccesses].map((item: Access) => item.locationId),
      )
      const accessedLocations: OrganizationLocation[] = (
        await this.organizationService.getAllLocations(organizationId)
      ).filter((location) => accessedLocationIds.has(location.id))

      const locationsWithAccesses = accessedLocations.map((location) => {
        const entry = enteringAccesses.find((access) => access.locationId === location.id)
        const exit = exitingAccesses.find((access) => access.locationId === location.id)
        return {
          location,
          entry,
          exit: entry && exit && new Date(entry.enteredAt) < new Date(entry.exitAt) ? exit : null,
        }
      })
      res.json(actionSucceed(locationsWithAccesses))
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
      const rawTraces = await this.attestationService.getTracesInPeriod(
        isParentUser ? userId : parentUserId,
        from,
        to,
        isParentUser ? null : userId,
      )

      // filter down to only the overlaps with the user we're interested in
      const relevantTraces = rawTraces
        .map((trace) => {
          const exposures = trace.exposures.map((exposure) => {
            const overlapping = exposure.overlapping.filter((overlap) =>
              isParentUser ? !overlap.sourceDependantId : overlap.sourceDependantId === userId,
            )
            return {...exposure, overlapping}
          })

          return {
            ...trace,
            exposures: exposures.filter(({overlapping}) => overlapping.length),
          }
        })
        .filter(({exposures}) => exposures.length)

      // ids of all the users we need more information about
      const allUserIds = new Set<string>()
      const allDependantIds = new Set<string>()
      relevantTraces.forEach(({exposures}) =>
        exposures.forEach((exposure) => {
          exposure.overlapping.forEach((overlap) => {
            allUserIds.add(overlap.userId)
            if (overlap.dependant) {
              allDependantIds.add(overlap.dependant.id)
            }
          })
        }),
      )

      const {
        locationsLookup: locationsById,
        statusesLookup,
        usersLookup: usersById,
        groupsLookup: groupsById,
      } = await this.getLookups(allUserIds, allDependantIds, organizationId)

      // group memberships for all the users we're interested in
      // dependant membership is already included in the trace
      const userGroups = await this.organizationService.getUsersGroups(organizationId, null, [
        ...allUserIds,
      ])
      const groupsByUserId: Record<string, OrganizationGroup> = userGroups.reduce(
        (lookup, groupLink) => ({...lookup, [groupLink.userId]: groupsById[groupLink.groupId]}),
        {},
      )

      // WARNING: adding properties to models may not cause them to appear here
      const result = relevantTraces.map(({date, duration, exposures}) => ({
        date,
        duration,
        exposures: exposures.map(({overlapping, date, organizationId, locationId}) => ({
          date,
          organizationId,
          location: locationsById[locationId],
          overlapping: overlapping.map(({userId, dependant, start, end}) => ({
            userId,
            status: statusesLookup[userId] ?? PassportStatuses.Pending,
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
                  status: statusesLookup[dependant.id] ?? PassportStatuses.Pending,
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

  private getLookups = async (
    userIds: Set<string>,
    dependantIds: Set<string>,
    organizationId: string,
  ): Promise<Lookups> => {
    // N queries
    const statuses = await Promise.all(
      [...dependantIds, ...userIds].map(
        async (id): Promise<{id: string; status: PassportStatus}> => ({
          id,
          status: await this.attestationService.latestStatus(id),
        }),
      ),
    )
    // keyed by user or dependant ID
    const statusesByUserOrDependantId: Record<string, PassportStatus> = statuses.reduce(
      (lookup, curr) => ({...lookup, [curr.id]: curr.status}),
      {},
    )

    const usersById = await this.getUsersById([...userIds])

    const allDependants: UserDependant[] = _.flatten(
      await Promise.all([...userIds].map((id) => this.userService.getAllDependants(id))),
    )

    // every group this organization contains
    const allGroups = await this.organizationService.getGroups(organizationId)
    const groupsById: Record<string, OrganizationGroup> = allGroups.reduce(
      (lookup, group) => ({...lookup, [group.id]: group}),
      {},
    )
    // every location this organization contains
    const allLocations = await this.organizationService.getAllLocations(organizationId)
    const locationsById: Record<string, OrganizationLocation> = allLocations.reduce(
      (lookup, location) => ({...lookup, [location.id]: location}),
      {},
    )
    // group memberships for all the users and dependants we're interested in
    const userGroups = await this.organizationService.getUsersGroups(organizationId, null, [
      ...userIds,
      ...dependantIds,
    ])
    const groupsByUserOrDependantId: Record<string, OrganizationGroup> = userGroups.reduce(
      (lookup, groupLink) => ({...lookup, [groupLink.userId]: groupsById[groupLink.groupId]}),
      {},
    )
    const dependantsById: Record<string, AugmentedDependant> = allDependants
      .map(
        (dependant): AugmentedDependant => ({
          ...dependant,
          group: groupsByUserOrDependantId[dependant.id],
          status: statusesByUserOrDependantId[dependant.id],
        }),
      )
      .reduce(
        (lookup, dependant) => ({
          ...lookup,
          [dependant.id]: dependant,
        }),
        {},
      )
    return {
      usersLookup: usersById,
      dependantsLookup: dependantsById,
      locationsLookup: locationsById,
      groupsLookup: groupsById,
      statusesLookup: statusesByUserOrDependantId,
    }
  }

  private getAccessHistory = async (
    from: string | null,
    to: string | null,
    userId: string,
    parentUserId: string | null,
  ): Promise<{enteringAccesses: Access[]; exitingAccesses: Access[]}> => {
    const live = !from && !to

    const betweenCreatedDate = {
      from: live ? moment(now()).startOf('day').toDate() : new Date(from),
      to: live ? undefined : new Date(to),
    }
    const accesses = parentUserId
      ? await this.accessService.findAllWithDependents({
          userId: parentUserId,
          dependentId: userId,
          betweenCreatedDate,
        })
      : (
          await this.accessService.findAllWith({
            userIds: [userId],
            betweenCreatedDate,
          })
        ).filter((acc) => acc.includesGuardian)
    const enteringAccesses = accesses.filter((access) => {
      if (parentUserId) {
        return access.dependants[userId]?.enteredAt
      } else {
        return access.enteredAt
      }
    })
    const exitingAccesses = accesses.filter((access) => {
      if (parentUserId) {
        return access?.dependants[userId]?.exitAt
      } else {
        return access.exitAt
      }
    })
    enteringAccesses.sort((a, b) => {
      // @ts-ignore timestamps are actually strings
      const aEnter = new Date(parentUserId ? a.dependants[userId].enteredAt : a.enteredAt)
      // @ts-ignore timestamps are actually strings
      const bEnter = new Date(parentUserId ? b.dependants[userId].enteredAt : b.enteredAt)
      if (aEnter < bEnter) {
        return -1
      } else if (bEnter < aEnter) {
        return 1
      }
      return 0
    })
    exitingAccesses.sort((a, b) => {
      // @ts-ignore timestamps are actually strings
      const aExit = new Date(parentUserId ? a.dependants[userId].exitAt : a.exitAt)
      // @ts-ignore timestamps are actually strings
      const bExit = new Date(parentUserId ? b.dependants[userId].exitAt : b.exitAt)
      if (aExit < bExit) {
        return -1
      } else if (bExit < aExit) {
        return 1
      }
      return 0
    })
    return {
      enteringAccesses,
      exitingAccesses,
    }
  }

  getUserContactTraceExposures = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {organizationId} = req.params
      const {userId, parentUserId, from, to} = req.query as UserContactTraceReportRequest

      const fromDateString = from ? moment(new Date(from)).tz(timeZone).format('YYYY-MM-DD') : null
      const toDateString = to ? moment(new Date(to)).tz(timeZone).format('YYYY-MM-DD') : null
      // fetch exposures in the time period
      const rawTraces = await this.attestationService.getExposuresInPeriod(
        userId,
        fromDateString,
        toDateString,
      )

      // ids of all the users we need more information about
      // dependant info is already included in the trace
      const allUserIds = new Set<string>()
      const allDependantIds = new Set<string>()
      rawTraces.forEach((exposure) => {
        ;(exposure.dependantIds ?? []).forEach((id) => allDependantIds.add(id))
        allUserIds.add(exposure.userId)
      })

      const {
        locationsLookup: locationsById,
        statusesLookup,
        usersLookup: usersById,
        dependantsLookup: allDependantsById,
        groupsLookup: groupsByUserOrDependantId,
      } = await this.getLookups(allUserIds, allDependantIds, organizationId)

      // WARNING: adding properties to models may not cause them to appear here
      const result = rawTraces.map(({date, duration, exposures}) => ({
        date,
        duration,
        exposures: exposures
          .map(({overlapping, date, organizationId, locationId}) => ({
            date,
            organizationId,
            location: locationsById[locationId],
            overlapping: overlapping
              .filter(
                (overlap) => (parentUserId ? overlap.dependant?.id : overlap.userId) === userId,
              )
              .map((overlap) => ({
                userId: overlap.sourceUserId,
                status: statusesLookup[overlap.sourceUserId] ?? PassportStatuses.Pending,
                group: groupsByUserOrDependantId[overlap.sourceUserId],
                firstName: usersById[overlap.sourceUserId].firstName,
                lastName: usersById[overlap.sourceUserId].lastName,
                base64Photo: usersById[overlap.sourceUserId].base64Photo,
                // @ts-ignore this is a firestore timestamp, not a string
                start: overlap.start?.toDate() ?? null,
                // @ts-ignore this is a firestore timestamp, not a string
                end: overlap.end?.toDate() ?? null,
                dependant: overlap.sourceDependantId
                  ? allDependantsById[overlap.sourceDependantId]
                  : null,
              })),
          }))
          .filter(({overlapping}) => overlapping.length),
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

      const isParentUser = !parentUserId

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
    const accessesByStatusToken: Record<string, Access[]> = await Promise.all(
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
          (byStatusToken, access) => ({
            ...byStatusToken,
            [access.statusToken]: [...(byStatusToken[access.statusToken] ?? []), access],
          }),
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
          if (userIds.includes(userId)) {
            console.warn(`Invalid state exception: Cannot find user for ID [${userId}]`)
          } else if (dependantIds.includes(userId)) {
            console.warn(`Invalid state exception: Cannot find dependant for ID [${userId}]`)
          } else {
            console.warn(`[${userId}] is not in userIds or dependantIds`)
          }
          return null
        }
        // access which represents the user's present location
        const activeAccess = (accessesByStatusToken[statusToken] || [])
          .filter((access) =>
            parentUserId
              ? access.userId === parentUserId && access.dependants[userId]
              : access.userId === userId && access.includesGuardian,
          )
          .map((access) => ({
            ...access,
            enteredAt: parentUserId
              ? ((access.dependants[userId]?.enteredAt ?? null) as string)
              : access.enteredAt,
            exitAt: parentUserId
              ? ((access.dependants[userId]?.exitAt ?? null) as string)
              : access.exitAt,
            status,
            user,
            userId,
          }))
          .reduce(getPriorityAccess, null)
        const access = activeAccess ?? {
          token: null,
          statusToken: null,
          locationId: null,
          createdAt: null,
          enteredAt: null,
          exitAt: null,
          includesGuardian: null,
          dependants: null,
        }

        return {
          ...access,
          userId,
          user,
          status,
          enteredAt: access.enteredAt,
          exitAt: access.exitAt,
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
      distinctAccesses[duplicateKey] = getPriorityAccess(distinctAccesses[duplicateKey], {
        ...access,
        user,
        status,
      })
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
