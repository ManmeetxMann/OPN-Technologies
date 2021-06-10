import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {
  actionReplyInsufficientPermission,
  actionSucceed as rawSucceed,
} from '../../../common/src/utils/response-wrapper'
import {HttpException} from '../../../common/src/exceptions/httpexception'
import {User, UserDependant} from '../../../common/src/data/user'
import {UserService} from '../../../common/src/service/user/user-service'
import {authorizationMiddleware} from '../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../common/src/types/authorization'
import {AdminProfile} from '../../../common/src/data/admin'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {now} from '../../../common/src/utils/times'
import {safeTimestamp} from '../../../common/src/utils/datetime-util'
import {Config} from '../../../common/src/utils/config'
import {PdfService} from '../../../common/src/service/reports/pdf'
import {LogInfo, LogWarning} from '../../../common/src/utils/logging-setup'
import {adminOrSelf} from '../middleware/admin-or-self'

import {
  OrganizationGroup,
  OrganizationLocation,
  OrganizationUsersGroup,
  OrganizationUsersGroupMoveOperation,
  OrganizationReminderSchedule,
  organizationDTOResponse,
} from '../models/organization'
import {OrganizationService} from '../services/organization-service'
import {ReportService} from '../services/report-service'
import {StatsFilter} from '../models/stats'
import {FamilyStatusReportRequest, UserContactTraceReportRequest} from '../types/trace-request'

import {AttestationService} from '../../../passport/src/services/attestation-service'
import {PassportStatuses} from '../../../passport/src/models/passport'

import {QuestionnaireService} from '../../../lookup/src/services/questionnaire-service'

import {Access} from '../../../access/src/models/access'

import {NextFunction, Request, Response, Router} from 'express'
import moment from 'moment'
import {CloudTasksClient} from '@google-cloud/tasks'
import * as _ from 'lodash'

const timeZone = Config.get('DEFAULT_TIME_ZONE')
const actionSucceed = (body?: unknown, userId?: string): ReturnType<typeof rawSucceed> => {
  if (userId && userId === Config.get('USER_OF_INTEREST')) {
    console.log(`Response to ${userId}`, body)
  }
  return rawSucceed(body)
}
const dataConversionAndSortGroups = (groups: OrganizationGroup[]): OrganizationGroup[] => {
  return groups
    .sort((a, b) => {
      // if a has higher priority, return a negative number (a comes first)
      const bias = (b.priority || 0) - (a.priority || 0)
      return bias || a.name.localeCompare(b.name, 'en', {numeric: true})
    })
    .map((group) => ({...group, isPrivate: group.isPrivate ?? false}))
}
const replyInsufficientPermission = (res: Response): Response =>
  res.status(403).json(actionReplyInsufficientPermission())

class OrganizationController implements IControllerBase {
  public router = Router()
  private organizationService = new OrganizationService()
  private userService = new UserService()
  private reportService = new ReportService()
  private attestationService = new AttestationService()
  private questionnaireService = new QuestionnaireService()
  private pdfService = new PdfService()
  private taskClient = new CloudTasksClient()

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
        .get(
          '/',
          authorizationMiddleware([RequiredUserPermission.OrgAdmin], true),
          this.getGroupsForAdmin,
        )
        .get('/public', this.getGroupsForPublic)
        .put('/', this.updateMultipleUserGroup)
        .post('/users', this.addUsersToGroups)
        .put('/:groupId/users/:userId', this.updateUserGroup)
        .delete('/zombie-users', this.removeZombieUsersInGroups)
        .delete('/:groupId', this.removeGroup)
        .delete('/:groupId/users/:userId', this.removeUserFromGroup),
    )
    // this has to be more specific than the general 'stats' section
    // TODO: move these to a separate route prefix, to avoid repetition
    const sharedAccess = authorizationMiddleware(
      [RequiredUserPermission.OrgAdmin, RequiredUserPermission.RegUser],
      true,
    )
    const publicStats = [
      innerRouter().use(
        '/stats/family',
        sharedAccess,
        adminOrSelf,
        innerRouter().get('/', this.getFamilyStats),
      ),
      innerRouter().use(
        '/stats/contact-trace-locations',
        sharedAccess,
        adminOrSelf,
        innerRouter().get('/', this.getUserContactTraceLocations),
      ),
      innerRouter().use(
        '/stats/contact-traces',
        sharedAccess,
        adminOrSelf,
        innerRouter().get('/', this.getUserContactTraces),
      ),
      innerRouter().use(
        '/stats/contact-trace-exposures',
        sharedAccess,
        adminOrSelf,
        innerRouter().get('/', this.getUserContactTraceExposures),
      ),
      innerRouter().use(
        '/stats/contact-trace-attestations',
        sharedAccess,
        adminOrSelf,
        innerRouter().get('/', this.getUserContactTraceAttestations),
      ),
    ]
    // prettier-ignore
    const stats = innerRouter().use(
      '/stats',
      authorizationMiddleware([RequiredUserPermission.OrgAdmin], true),
      innerRouter()
        .get('/', this.getStatsInDetailForGroupsOrLocations)
        .get('/health', this.getStatsHealth)
        .get('/group-report', this.getGroupReport)
        .get('/user-report', this.getUserReport)
    )
    const organizations = Router().use(
      '/organizations',
      Router().post('/:organizationId/scheduling', this.updateReportInfo), // TODO: must be a protected route
      Router().get('/one', this.findOneByKeyOrId),
      Router().use('/:organizationId', locations, groups, ...publicStats, stats),
      Router().get('/:organizationId/config', this.getOrgConfig),
    )

    this.router.use(organizations)
  }
  private populateZones = async (location: OrganizationLocation, organizationId: string) => {
    if (location.allowAccess || location.zones) {
      // location cannot have children
      return
    }
    const fetchOrganization = this.organizationService.findOneById(organizationId)
    const fetchZones = this.organizationService.getLocations(organizationId, location.id)
    const [organization, zones] = await Promise.all([fetchOrganization, fetchZones])

    zones.sort((a, b) => a.title.localeCompare(b.title, 'en', {numeric: true}))
    location.zones = zones.map(
      ({id, title, address, attestationRequired, allowsSelfCheckInOut}) => ({
        id,
        title,
        address,
        attestationRequired,
        questionnaireId: organization.questionnaireId,
        allowsSelfCheckInOut,
      }),
    )
  }

  private validatePermission = (
    authenticatedUser: User,
    organizationId: string,
    userId: string,
    parentUserId: string,
  ): void => {
    if (authenticatedUser.admin) {
      // if they are an admin, it must for for this organization
      if ((authenticatedUser.admin as AdminProfile).adminForOrganizationId !== organizationId) {
        throw 'Invalid'
      }
    } else {
      // if they are a regular user, they must be asking about themself or their dependant
      if ((parentUserId || userId) !== authenticatedUser.id) {
        throw 'Invalid'
      }
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
      const authenticatedUser = res.locals.connectedUser as User
      // Further validation
      if ((!key && !id) || (!!key && !!id))
        throw new BadRequestException('Key or Id is required independently')

      const organization = !!key
        ? await this.organizationService.findOrganizationByKey(parseInt(key))
        : await this.organizationService.findOneById(id)
      res.json(actionSucceed(organizationDTOResponse(organization), authenticatedUser?.id))
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
      const {parentLocationId, includeNfcGates} = req.query as {
        parentLocationId?: string
        includeNfcGates?: boolean
      }
      const locations = await this.organizationService.getLocations(
        organizationId,
        parentLocationId,
      )
      await Promise.all(
        locations.map(async (location) => this.populateZones(location, organizationId)),
      )

      // Filter NFC gates out
      const filteredLocations = includeNfcGates
        ? locations
        : locations.filter((location) => {
            return !('nfcGateOnly' in location && location.nfcGateOnly === true)
          })

      // Sort
      filteredLocations.sort((a, b) => a.title.localeCompare(b.title, 'en', {numeric: true}))

      res.json(actionSucceed(filteredLocations))
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
      const groups = await this.getPublicGroups(organizationId)
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
      await Promise.all(
        groups.map(async (group) => {
          const groupId = group.id
          const usersGroups = await this.organizationService.getUsersGroups(organizationId, groupId)
          return Promise.all(
            usersGroups.map(async (item) => {
              // If parent is not null then userId represents a dependent id
              const {id, userId, parentUserId} = item
              const userExists = parentUserId
                ? (await this.userService.getAllDependants(parentUserId)).some(
                    (dependant) => dependant.id === userId,
                  )
                : !!(await this.userService.findOneSilently(userId))
              // Let's see if we need to delete the user group membership
              if (!userExists) {
                console.log(
                  `Deleting user-group [${id}] for user [${userId}] and [${parentUserId}] from group [${groupId}]`,
                )
                return this.organizationService.removeUserFromGroup(organizationId, groupId, userId)
              }
            }),
          )
        }),
      )

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
        console.warn(
          `OrganizationController: getStatsInDetailForGroupsOrLocations: Can not access OrganizationID: ${organizationId}`,
        )
        replyInsufficientPermission(res)
        return
      }

      // If group is specified, make sure we are group admin
      if (groupId) {
        const hasGrantedPermission = isSuperAdmin || admin.adminForGroupIds?.includes(groupId)
        if (!hasGrantedPermission) {
          console.warn(
            `OrganizationController: getStatsInDetailForGroupsOrLocations: Can not access GroupId: ${groupId}`,
          )
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
          console.warn(
            `OrganizationController: getStatsInDetailForGroupsOrLocations: Can not access LocationId: ${locationId}`,
          )
          replyInsufficientPermission(res)
          return
        }
        // Assert location exists
        await this.organizationService.getLocation(organizationId, locationId)
      }

      // If no group and no location is specified, make sure we are the health admin
      if (!groupId && !locationId && !isHealthAdmin) {
        console.warn(
          `OrganizationController: getStatsInDetailForGroupsOrLocations: Is not HealthAdmin for OrganizationID: ${organizationId}`,
        )
        replyInsufficientPermission(res)
        return
      }

      const response = await this.reportService.getStatsHelper(organizationId, {
        groupId,
        locationId,
        from,
        to,
      })

      res.json(actionSucceed(response))
    } catch (error) {
      next(error)
    }
  }

  getUserReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId} = req.params
      const {userId, parentUserId, from: queryFrom, to: queryTo} = req.query
      const authenticatedUser = res.locals.connectedUser as User
      const admin = authenticatedUser.admin as AdminProfile
      const isSuperAdmin = admin.superAdminForOrganizationIds?.includes(organizationId)
      const canAccessOrganization = isSuperAdmin || admin.adminForOrganizationId === organizationId

      if (!canAccessOrganization) {
        replyInsufficientPermission(res)
        return
      }
      const to: string = (queryTo as string) ?? now().toISOString()
      const from: string =
        (queryFrom as string) ??
        moment(now()).tz(timeZone).startOf('day').subtract(2, 'days').toISOString()
      // @ts-ignore these are strings
      const allIds: string[] = parentUserId ? [parentUserId, userId] : [userId]

      const [organization, lookup] = await Promise.all([
        this.organizationService.findOneById(organizationId),
        this.reportService.getLookups(new Set(allIds), organizationId),
      ])

      const questionnaireId = organization.questionnaireId
      const questionnaire = await this.questionnaireService.getQuestionnaire(questionnaireId)

      const {content, tableLayouts} = await this.reportService.getUserReportTemplate(
        organization,
        userId as string,
        parentUserId as string,
        from,
        to,
        lookup,
        [questionnaire],
      )

      const stream = this.pdfService.generatePDFStream(content, tableLayouts)
      res.contentType('application/pdf')
      stream.pipe(res)
      res.status(200)
    } catch (error) {
      next(error)
    }
  }

  getGroupReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId} = req.params
      const {groupId} = req.query as {groupId: string}
      const authenticatedUser = res.locals.connectedUser as User
      const admin = authenticatedUser.admin as AdminProfile
      const isSuperAdmin = admin.superAdminForOrganizationIds?.includes(organizationId)
      const canAccessOrganization = isSuperAdmin || admin.adminForOrganizationId === organizationId
      const hasGrantedPermission = isSuperAdmin || admin.adminForGroupIds?.includes(groupId)
      if (!hasGrantedPermission) {
        replyInsufficientPermission(res)
        return
      }

      if (!canAccessOrganization) {
        replyInsufficientPermission(res)
        return
      }

      // Assert group exists
      await this.organizationService.getGroup(organizationId, groupId)

      const memberships = await this.organizationService.getUsersGroups(organizationId, groupId)
      const userIds = new Set<string>()
      memberships.forEach((membership) => {
        if (membership.parentUserId) {
          userIds.add(membership.parentUserId)
        }
        userIds.add(membership.userId)
      })
      LogInfo('getGroupReport', 'MembershipsFound', {
        count: memberships.length,
        organizationId,
        groupId,
      })
      const membershipLimit = parseInt(Config.get('PDF_GENERATION_EMAIL_THRESHOLD') ?? '100', 10)
      const to = moment(now()).tz(timeZone).endOf('day').toISOString()
      const from = moment(to).startOf('day').subtract(30, 'days').toISOString()
      if (membershipLimit <= memberships.length) {
        // @ts-ignore admin is not a field value
        const email = authenticatedUser.admin.email as string
        if (!email) {
          throw 'No email found'
        }
        res.json(
          actionSucceed({
            reponseType: 'email',
            message: `Report for ${memberships.length} users will be emailed to ${email}`,
          }),
        )
        const path = this.taskClient.queuePath(
          Config.get('GAE_PROJECT_NAME'),
          Config.get('GAE_LOCATION'), // northamerica-northeast1
          Config.get('QUEUE_NAME'),
        )
        const task = {
          appEngineHttpRequest: {
            httpMethod: 'POST',
            relativeUri: '/internal/group-report',
            body: Buffer.from(
              JSON.stringify({
                groupId,
                organizationId,
                email,
                name: `${authenticatedUser.firstName} ${authenticatedUser.lastName}`,
                from,
                to,
              }),
            ).toString('base64'),
            headers: {
              'Content-Type': 'application/json',
            },
          },
        }
        const request = {
          parent: path,
          task,
        }

        try {
          LogInfo('getGroupReport', 'CreateCloudTask', {path})
          // @ts-ignore POST has type string
          await this.taskClient.createTask(request)
        } catch (error) {
          LogWarning('getGroupReport', 'CreateCloudTaskFailed', {error})
        }

        return
      }
      const [organization, lookups] = await Promise.all([
        this.organizationService.findOneById(organizationId),
        this.reportService.getLookups(userIds, organizationId),
      ])

      const questionnaireId = organization.questionnaireId
      const questionnaire = await this.questionnaireService.getQuestionnaire(questionnaireId)
      LogInfo('getGroupReport', 'LookupsRetrieved', {organizationId})

      const allTemplates = await Promise.all(
        memberships
          .filter((membership) => lookups.usersLookup[membership.userId])
          .map((membership) =>
            this.reportService
              .getUserReportTemplate(
                organization,
                membership.userId,
                membership.parentUserId,
                from,
                to,
                lookups,
                [questionnaire],
              )
              .catch((err) => {
                LogWarning('getGroupReport', 'GettingContentFailed', {
                  error: `${JSON.stringify(membership)} - ${err}`,
                })
                return {
                  content: [],
                  tableLayouts: null,
                }
              }),
          ),
      )
      LogInfo('getGroupReport', 'TemplatesRetrieved', {organizationId})
      if (!allTemplates.length) {
        throw new HttpException('There is no historical data available for this group.')
      }

      const tableLayouts = allTemplates.find(({tableLayouts}) => tableLayouts !== null).tableLayouts
      const content = _.flatten(_.map(allTemplates, 'content'))

      LogInfo('getGroupReport', 'GeneratingStream', {organizationId})
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

      const response = await this.reportService.getStatsHelper(organizationId, {
        groupId,
        locationId,
        from,
        to,
      })

      const accesses = response.accesses.filter(
        (access) =>
          access.status === PassportStatuses.Caution || access.status === PassportStatuses.Stop,
      )

      res.json(
        actionSucceed(
          {
            permissionToViewDetail: !!isHealthAdmin,
            asOfDateTime: response.asOfDateTime,
            passportsCountByStatus: response.passportsCountByStatus,
            hourlyCheckInsCounts: response.hourlyCheckInsCounts,
            ...(!!isHealthAdmin && {accesses}),
          },
          authenticatedUser.id,
        ),
      )
    } catch (error) {
      next(error)
    }
  }

  getUserContactTraceLocations = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {organizationId} = req.params
      const {userId, from: queryFrom, to: queryTo} = req.query as UserContactTraceReportRequest
      const to = queryTo ?? now().toISOString()
      const from = queryFrom ?? moment(to).subtract(24, 'hours').toISOString()

      const {enteringAccesses, exitingAccesses} = await this.reportService.getAccessHistory(
        from,
        to,
        userId,
      )

      const accessedLocationIds = new Set(
        [...enteringAccesses, ...exitingAccesses].map((item: Access) => item.locationId),
      )
      const accessedLocations: OrganizationLocation[] = (
        await this.organizationService.getAllLocations(organizationId)
      ).filter((location) => accessedLocationIds.has(location.id))

      const locationsWithAccesses = accessedLocations
        .map((location) => {
          const entries = enteringAccesses.filter((access) => access.locationId === location.id)
          const exits = exitingAccesses.filter((access) => access.locationId === location.id)
          return {
            location,
            entries,
            exits,
          }
        })
        .map((allAccessesForLocation) => {
          const {entries, exits, location} = allAccessesForLocation
          const pairs = []
          // now sorted earliest-first
          entries.reverse()
          exits.reverse()
          while (entries.length || exits.length) {
            const entryCandidate = entries[0] ?? null
            const entryTimestamp = entryCandidate ? entryCandidate.enteredAt : null
            const exitCandidate = exits[0] ?? null
            const exitTimestamp = exitCandidate ? exitCandidate.exitAt : null
            // @ts-ignore these are strings, not field values
            const entryDate = new Date(entryTimestamp)
            // @ts-ignore these are strings, not field values
            const exitDate = new Date(exitTimestamp)
            if (!entryCandidate && !exitCandidate) {
              console.warn('illegal state - no entry or exit')
              break
            }
            if (entryCandidate && !exitCandidate) {
              pairs.push({
                location,
                entry: entries.pop(),
                exit: null,
              })
              continue
            }
            if (exitCandidate && (!entryCandidate || exitDate < entryDate)) {
              // pairs.push({
              //   location,
              //   entry: null,
              //   exit: exits.pop(),
              // })
              // frontends don't accept entry: null
              exits.pop()
              continue
            }
            pairs.push({
              location,
              entry: entries.pop(),
              exit: exits.pop(),
            })
          }
          // sorted recent-first
          pairs.reverse()
          return pairs
        })
      res.json(actionSucceed(_.flatten(locationsWithAccesses)))
    } catch (error) {
      next(error)
    }
  }

  getUserContactTraces = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId} = req.params
      const {userId, from: queryFrom, to: queryTo} = req.query as UserContactTraceReportRequest
      const to = queryTo ?? now().toISOString()
      const from = queryFrom ?? moment(to).subtract(24, 'hours').toISOString()

      // fetch exposures in the time period
      const rawTraces = await this.attestationService.getTracesInPeriod(userId, from, to)
      // filter down to only the overlaps with the user we're interested in
      const relevantTraces = rawTraces
        .map((trace) => {
          const exposures = trace.exposures.map((exposure) => {
            const overlapping = exposure.overlapping
              .filter((overlap) => {
                return overlap.sourceUserId === userId && !overlap.sourceDependantId
              })
              .filter(
                (overlap) =>
                  //@ts-ignore these are timestamps, not strings
                  moment(overlap.end.toDate()) >= moment(from) &&
                  //@ts-ignore these are timestamps, not strings
                  moment(overlap.start.toDate()) <= moment(to),
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
      relevantTraces.forEach(({exposures}) =>
        exposures.forEach((exposure) => {
          exposure.overlapping.forEach((overlap) => {
            allUserIds.add(overlap.userId)
            if (overlap.dependant) {
              allUserIds.add(overlap.dependant.id)
            }
          })
        }),
      )

      const {
        locationsLookup: locationsById,
        statusesLookup,
        usersLookup: usersById,
        membershipLookup,
      } = await this.reportService.getLookups(allUserIds, organizationId)

      // WARNING: adding properties to models may not cause them to appear here
      const result = relevantTraces.map(({date, duration, exposures}) => ({
        date,
        duration,
        exposures: exposures.map(({overlapping, date, organizationId, locationId}) => ({
          date,
          organizationId,
          location: locationsById[locationId],
          overlapping: overlapping.map((overlap) => {
            const userId = overlap.dependant?.id ?? overlap.userId
            return {
              userId,
              status: statusesLookup[userId] ?? PassportStatuses.Pending,
              group: membershipLookup[userId],
              firstName: usersById[userId].firstName,
              lastName: usersById[userId].lastName,
              base64Photo: usersById[userId].base64Photo,
              start: overlap.start ? safeTimestamp(overlap.start) : null,
              end: overlap.end ? safeTimestamp(overlap.end) : null,
              dependant: null,
            }
          }),
        })),
      }))
      res.json(actionSucceed(result))
    } catch (error) {
      next(error)
    }
  }

  getUserContactTraceExposures = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {organizationId} = req.params
      const {
        userId,
        parentUserId,
        from: queryFrom,
        to: queryTo,
      } = req.query as UserContactTraceReportRequest
      const to = queryTo ?? now().toISOString()
      const from = queryFrom ?? moment(to).subtract(24, 'hours').toISOString()

      const fromDateString = moment(new Date(from)).tz(timeZone).format('YYYY-MM-DD')
      const toDateString = moment(new Date(to)).tz(timeZone).format('YYYY-MM-DD')
      // fetch exposures in the time period
      const rawTraces = await this.attestationService.getExposuresInPeriod(
        userId,
        fromDateString,
        toDateString,
      )

      // ids of all the users we need more information about
      const allUserIds = new Set<string>()
      rawTraces.forEach((exposure) => {
        allUserIds.add(exposure.userId)
        // eslint-disable-next-line @typescript-eslint/no-extra-semi
        ;(exposure.dependantIds ?? []).forEach((id) => allUserIds.add(id))
      })

      const {
        locationsLookup: locationsById,
        statusesLookup,
        usersLookup: usersById,
        membershipLookup: groupsByUserOrDependantId,
      } = await this.reportService.getLookups(allUserIds, organizationId)

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
              .filter((overlap) => {
                if (parentUserId) {
                  return overlap.dependant?.id === userId
                } else {
                  return overlap.userId === userId && !overlap.dependant
                }
              })
              .filter(
                (overlap) =>
                  //@ts-ignore these are timestamps, not strings
                  moment(overlap.end.toDate()) >= moment(from) &&
                  //@ts-ignore these are timestamps, not strings
                  moment(overlap.start.toDate()) <= moment(to),
              )
              .map((overlap) => {
                const userId = overlap.sourceDependantId ?? overlap.sourceUserId
                return {
                  userId,
                  status: statusesLookup[userId] ?? PassportStatuses.Pending,
                  group: groupsByUserOrDependantId[userId],
                  firstName: usersById[userId].firstName,
                  lastName: usersById[userId].lastName,
                  base64Photo: usersById[userId].base64Photo,
                  start: overlap.start ? safeTimestamp(overlap.start) : null,
                  end: overlap.end ? safeTimestamp(overlap.end) : null,
                  dependant: null,
                }
              }),
          }))
          .filter(({overlapping}) => overlapping.length),
      }))
      res.json(actionSucceed(result))
    } catch (error) {
      next(error)
    }
  }

  /**
   * TODO:
   * 1. Check functionality of this feature after questionary ID migration.
   * 2. Consider querying attestationsInOrg from DB instead of filtering in controller.
   */
  getUserContactTraceAttestations = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {organizationId} = req.params
      const {userId, parentUserId, from, to} = req.query as UserContactTraceReportRequest
      const primaryUserId = parentUserId ?? userId
      // fetch attestation array in the time period
      const [
        allAttestations,
        organization,
        {guardian, dependants},
        parentMembership,
        dependantMemberships,
        groups,
      ] = await Promise.all([
        this.attestationService.getAttestationsInPeriod(userId, from, to),
        this.organizationService.findOneById(organizationId),
        this.userService.getUserAndDependants(primaryUserId),
        this.organizationService.getUsersGroups(organizationId, null, [primaryUserId]),
        this.organizationService.getDependantGroups(organizationId, primaryUserId),
        this.organizationService.getGroups(organizationId),
      ])

      const questionnaireId = organization.questionnaireId
      const attestationsInOrg = allAttestations.filter(
        (att) => questionnaireId === att.questionnaireId,
      )
      const questionnaires = await this.questionnaireService.getQuestionnaire(questionnaireId)

      const allMemberships = [...parentMembership, ...dependantMemberships]
      const groupsById: Record<string, OrganizationGroup> = groups.reduce((lookup, group) => {
        lookup[group.id] = group
        return lookup
      }, {})

      const response = attestationsInOrg.map(
        // @ts-ignore 'timestamps' does not exist in typescript
        ({timestamps, attestationTime, locationId, appliesTo, ...passThrough}) => ({
          ...passThrough,
          locationId,
          attestationTime: safeTimestamp(attestationTime),
          questions: questionnaires.questions,
          appliesTo,
          appliesToUsers: appliesTo.map((appliesToId) => {
            const user =
              appliesToId === primaryUserId
                ? guardian
                : dependants.find((dep) => dep.id === appliesToId)
            return {
              id: appliesToId,
              firstName: user?.firstName ?? 'deleted',
              lastName: user?.lastName ?? 'user',
              base64Photo: user?.base64Photo ?? '',
              group:
                groupsById[
                  allMemberships.find((membership) => membership.userId === appliesToId)?.groupId ??
                    ''
                ] ?? null,
            }
          }),
        }),
      )
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
        organizationId,
      )

      const dependents = await this.userService.getAllDependants(
        isParentUser ? userId : parentUserId,
      )

      const dependentsInOrg = dependents.filter((dependent) =>
        dependent.organizationIds.includes(organizationId),
      )

      const dependentsWithGroup = await Promise.all(
        dependentsInOrg.map(async (dependent: UserDependant) => {
          const group = await this.organizationService.getUserGroup(organizationId, dependent.id)
          const dependentStatus = await this.attestationService.latestStatus(
            dependent.id,
            organizationId,
          )

          return {
            ...dependent,
            groupId: group.id,
            groupName: group.name,
            status: dependentStatus,
          }
        }),
      )

      const response = {
        parent: {
          id: parent.id,
          firstName: parent.firstName,
          lastName: parent.lastName,
          groupId: parentGroup.id,
          groupName: parentGroup.name,
          base64Photo: parent.base64Photo,
          status: parentStatus,
        },
        // Frontends break if this is not provided
        // However, this should be null when parent is the user
        // in the query args
        // parent: parentUserId
        //   ? {
        //       id: parent.id,
        //       firstName: parent.firstName,
        //       lastName: parent.lastName,
        //       groupName: parentGroup.name,
        //       base64Photo: parent.base64Photo,
        //       status: parentStatus,
        //     }
        //   : null,
        dependents: dependentsWithGroup.filter((dependant) => dependant.id !== userId),
      }

      res.json(actionSucceed(response))
    } catch (error) {
      next(error)
    }
  }

  private async getGroups(organizationId: string): Promise<OrganizationGroup[]> {
    return this.organizationService.getGroups(organizationId).then(dataConversionAndSortGroups)
  }

  private async getPublicGroups(organizationId: string): Promise<OrganizationGroup[]> {
    return this.organizationService
      .getPublicGroups(organizationId)
      .then(dataConversionAndSortGroups)
  }
}

export default OrganizationController
