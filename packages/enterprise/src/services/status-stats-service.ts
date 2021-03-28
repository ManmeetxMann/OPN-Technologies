import DataStore from '../../../common/src/data/datastore'
import {safeTimestamp, isPassed} from '../../../common/src/utils/datetime-util'
import {now} from '../../../common/src/utils/times'
import {Config} from '../../../common/src/utils/config'

import {UserActionsRepository} from '../repository/action-items.repository'
import {StatusStatsRepository} from '../repository/status-stats.repository'

import {PassportStatuses} from '../../../passport/src/models/passport'
import moment from 'moment'
import {StatusStats} from '../models/status-stats'

export class StatusStatsService {
  private dataStore = new DataStore()

  public async getLatestStats(orgId: string, groupId: string): Promise<StatusStats> {
    const expiryHours = parseInt(Config.get('PASSPORT_EXPIRY_TIME_DAILY_IN_HOURS'))
    const date = moment(now()).subtract(expiryHours, 'hours').utc().format('YYYY-MM-DD')
    const repo = new StatusStatsRepository(this.dataStore, orgId, groupId)
    const latest = await repo.getLatest()
    if (!latest) {
      const result = await repo.initializeStatuses(date, [], [])
      return result
    }
    if (latest.date === date) {
      return latest
    }
    // need to create the new day's stats
    // some might carry over
    const allIds: string[] = [...latest[PassportStatuses.Stop], ...latest[PassportStatuses.Caution]]
    const stop = []
    const caution = []
    await Promise.all(
      allIds.map(
        async (id: string): Promise<void> => {
          const userRepo = new UserActionsRepository(this.dataStore, id)
          const latestResult = await userRepo.findOneById(orgId)
          if (
            latestResult?.latestPassport &&
            !isPassed(safeTimestamp(latestResult.latestPassport.expiry))
          ) {
            if (latestResult.latestPassport.status === PassportStatuses.Stop) {
              stop.push(id)
            }
            if (latestResult.latestPassport.status === PassportStatuses.Caution) {
              caution.push(id)
            }
          }
        },
      ),
    )
    const created = await repo.initializeStatuses(date, stop, caution)
    return created
  }

  public async updateStatsForUser(
    orgId: string,
    groupId: string,
    userId: string,
    status: PassportStatuses,
  ): Promise<unknown> {
    // make sure today's stats are available
    await this.getLatestStats(orgId, groupId)
    const expiryHours = parseInt(Config.get('PASSPORT_EXPIRY_TIME_DAILY_IN_HOURS'))
    const date = moment(now()).subtract(expiryHours, 'hours').utc().format('YYYY-MM-DD')
    await new StatusStatsRepository(this.dataStore, orgId, groupId).recordStatus(
      date,
      userId,
      status,
    )
    return
  }
}
