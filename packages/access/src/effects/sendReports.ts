import moment from 'moment-timezone'
import * as _ from 'lodash'

import DataStore from '../../../common/src/data/datastore'
import {AdminApprovalModel} from '../../../common/src/data/admin'
import {
  OrganizationLocationModel,
  OrganizationModel,
} from '../../../enterprise/src/repository/organization.repository'
import {OrganizationGroup} from '../../../enterprise/src/models/organization'
import {OrganizationService} from '../../../enterprise/src/services/organization-service'
import {UserModel, User} from '../../../common/src/data/user'
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
    const reports = _.flatten(reportPages)
    const userIds = new Set<string>()
    reports.forEach((report) => {
      report.accessingUsers.forEach((userId) => userIds.add(userId))
    })
    const userIdList = [...userIds]
    const userPages = []
    for (let i = 0; i < userIdList.length; i += 10) {
      userPages.push(userIdList.slice(i, i + 10))
    }
    const users: User[] = _.flatten(
      await Promise.all(userPages.map((page) => this.userRepo.findWhereIdIn(page))),
    )

    const allGroups = (await this.orgService.getGroups(organizationId)).reduce((byId, group) => {
      byId[group.id] = group
      return byId
    }, {} as Record<string, OrganizationGroup>)

    // TODO: this is an extremely expensive loop. See issue #429 in github
    const allUsersWithDependantsAndGroups = await Promise.all(
      users.map(async (user) => {
        return {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          orgId: user.organizationIds[0],
          groups: await this.orgService.getUsersGroups(organizationId, null, [user.id]),
          delegates: user.delegates,
        }
      }),
    )

    const userDependantLookup: Record<string, UserGroupData> = allUsersWithDependantsAndGroups
      .map((lookup) => ({
        id: lookup.id,
        orgId: lookup.orgId,
        groupNames: lookup.groups.map((membership) => allGroups[membership.groupId]?.name),
        delegates: lookup.delegates,
        dependants: [],
      }))
      .reduce((lookup, data) => {
        lookup[data.id] = data
        return lookup
      }, {})

    const keys = Object.keys(userDependantLookup)
    keys.forEach((userId) => {
      const user = userDependantLookup[userId]
      if (!user.delegates?.length) {
        // not a dependant
        return
      }
      user.delegates.forEach((delegateId) => {
        const delegate = userDependantLookup[delegateId]
        if (delegate) {
          delegate.dependants.push(user)
        }
      })
    })

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
