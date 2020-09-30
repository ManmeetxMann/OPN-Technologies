import moment from 'moment-timezone'

import DataStore from '../../../common/src/data/datastore'
import {AdminApprovalModel} from '../../../common/src/data/admin'
import {
  OrganizationLocationModel,
  OrganizationModel,
} from '../../../enterprise/src/repository/organization.repository'
import {OrganizationService} from '../../../enterprise/src/services/organization-service'
import {UserModel} from '../../../common/src/data/user'
import {UserService} from '../../../common/src/service/user/user-service'
import {AttendanceRepository} from '../repository/attendance.repository'

import {getAccessSection, UserGroupData} from './exposureTemplate'
import {send} from '../../../common/src/service/messaging/send-email'
import {now} from '../../../common/src/utils/times'
import {Config} from '../../../common/src/utils/config'

const timeZone = Config.get('DEFAULT_TIME_ZONE')
const SUPPRESS_USER_EMAILS = Config.get('FEATURE_ONLY_EMAIL_SUPPORT') === 'enabled'

export default class ReportSender {
  repo: AttendanceRepository
  dataStore: DataStore
  userRepo: UserModel
  userApprovalRepo: AdminApprovalModel
  orgRepo: OrganizationModel
  orgService: OrganizationService
  userService: UserService

  constructor() {
    this.dataStore = new DataStore()
    this.repo = new AttendanceRepository(this.dataStore)
    this.userRepo = new UserModel(this.dataStore)
    this.userApprovalRepo = new AdminApprovalModel(this.dataStore)
    this.orgRepo = new OrganizationModel(this.dataStore)
    this.orgService = new OrganizationService()
    this.userService = new UserService()
  }

  async mailForHour(hour: number): Promise<void> {
    const organizations = await this.orgRepo.findWhereEqual('hourToSendReport', hour)
    await Promise.all(
      organizations.map((org) => {
        const dayShift = org.dayShift || 0
        const date = moment(now()).tz(timeZone).subtract(dayShift, 'days').format('YYYY-MM-DD')
        return this.mailFor(org.id, org.name, date)
      }),
    )
  }

  async mailFor(organizationId: string, organizationName: string, date: string): Promise<void> {
    const locations = await new OrganizationLocationModel(this.dataStore, organizationId).fetchAll()
    const allIds = locations.map(({id}) => id)
    const reportPages = await Promise.all(
      allIds.map((locationId) =>
        this.repo
          .findWhereEqual('date', date, `${locationId}/daily-reports`)
          .then((reports) => reports.map((report) => ({...report, locationId}))),
      ),
    )
    const reports = reportPages.reduce((flattened, page) => [...flattened, ...page], [])
    const userIds = new Set<string>()
    reports.forEach((report) => {
      report.accessingUsers.forEach((userId) => userIds.add(userId))
    })
    const userIdList = [...userIds]
    const userPages = []
    for (let i = 0; i < userIdList.length; i += 10) {
      userPages.push(userIdList.slice(i, i + 10))
    }
    const users = (
      await Promise.all(userPages.map((page) => this.userRepo.findWhereIdIn(page)))
    ).reduce((flattened, page) => [...flattened, ...page], [])

    const allGroups = await this.orgService.getGroups(organizationId)

    // TODO: this is an extremely expensive loop. See issue #429 in github
    const allUsersWithDependantsAndGroups = await Promise.all(
      users.map(async (user) => {
        return {
          id: user.id,
          orgId: user.organizationIds[0],
          groups: await this.orgService.getUsersGroups(organizationId, null, [user.id]),
          dependants: await this.userService.getAllDependants(user.id),
        }
      }),
    )

    const userDependantLookup: Record<string, UserGroupData> = allUsersWithDependantsAndGroups
      .map((lookup) => ({
        id: lookup.id,
        orgId: lookup.orgId,
        groupNames: lookup.groups.map(
          (membership) => allGroups.find((group) => group.id === membership.groupId)?.name,
        ),
        dependants: lookup.dependants.map((dep) => ({
          id: dep.id,
          groupName: allGroups.find((group) => group.id === dep.groupId)?.name,
        })),
      }))
      .reduce((lookup, data) => ({...lookup, [data.id]: data}), {})

    const message = reports
      .map((report) =>
        getAccessSection(
          report.accesses,
          users,
          locations.find(({id}) => id === report.locationId).title,
          date,
          userDependantLookup,
        ),
      )
      .join('\n<br>')
    const recipients = await this.userApprovalRepo.findWhereArrayInMapContains(
      'profile',
      'superAdminForOrganizationIds',
      organizationId,
    )
    const allEmails = recipients.map(({profile}) => profile.email)
    const recipientEmails = SUPPRESS_USER_EMAILS ? [] : allEmails
    send(recipientEmails, `Access Report ${date}, for ${organizationName}`, message)
  }
}
