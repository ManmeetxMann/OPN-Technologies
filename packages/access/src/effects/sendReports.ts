import TraceRepository from '../repository/trace.repository'
import DataStore from '../../../common/src/data/datastore'
import {AdminApprovalModel} from '../../../common/src/data/admin'

import {OrganizationLocationModel} from '../../../enterprise/src/repository/organization.repository'
import {UserModel} from '../../../common/src/data/user'

import {getAccessSection} from './exposureTemplate'

import {send} from '../../../common/src/service/messaging/send-email'

// When triggered, this creates a trace
export default class ReportSender {
  repo: TraceRepository
  dataStore: DataStore
  userRepo: UserModel
  userApprovalRepo: AdminApprovalModel

  constructor() {
    this.dataStore = new DataStore()
    this.repo = new TraceRepository(this.dataStore)
    this.userRepo = new UserModel(this.dataStore)
  }

  async mailFor(organizationId: string, date: string): Promise<void> {
    const locations = await new OrganizationLocationModel(this.dataStore, organizationId).fetchAll()
    const allIds = locations.map(({id}) => id)
    const idPages = []
    for (let i = 0; i < allIds.length; i += 10) {
      idPages.push(allIds.slice(i, i + 10))
    }
    const reportPages = await Promise.all(
      idPages.map((page) => this.repo.getAccessesForLocations(page, date)),
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
    const message = reports
      .map((report) =>
        getAccessSection(
          report.accesses,
          users,
          locations.find(({id}) => id === report.locationId).title,
          date,
        ),
      )
      .join('\n<br>')
    const recipients = await this.userApprovalRepo.findWhereMapKeyContains(
      'profile',
      'superAdminForOrganizationIds',
      organizationId,
    )
    const allEmails = recipients.map(({profile}) => profile.email)
    send(allEmails, 'Daily report', message)
  }
}
