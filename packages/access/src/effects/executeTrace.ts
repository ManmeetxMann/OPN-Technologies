import TraceRepository from '../repository/trace.repository'
import type {ExposureReport} from '../repository/trace.repository'
import DataStore from '../../../common/src/data/datastore'

const overlap = (a, b) => {
  if (a.exitAt < b.enteredAt || b.exitAt < a.enteredAt) {
    return null
  }
  return {
    start: (a.enteredAt < b.enteredAt ? b : a).enteredAt.toDate(),
    end: (a.exitAt > b.exitAt ? b : a).exitAt.toDate(),
  }
}

// When triggered, this creates a trace
export default class TraceListener {
  repo: TraceRepository
  constructor(dataStore: DataStore) {
    this.repo = new TraceRepository(dataStore)
  }

  async traceFor(userId: string): Promise<ExposureReport[]> {
    const accesses = await this.repo.getAccesses(userId)
    const result = accesses.map((dailyReport) => {
      const mainUser = dailyReport.accesses.filter((access) => access.userId === userId)
      const otherUsers = dailyReport.accesses.filter((access) => access.userId !== userId)
      // TODO: this could be made more efficient with some sorting

      const overlapping = otherUsers
        .map((access) =>
          mainUser
            .map((contaminated) => overlap(contaminated, access))
            .filter((exists) => exists)
            .map((range) => ({
              userId: access.userId,
              ...range,
            })),
        )
        .flat()

      return {
        date: dailyReport.date,
        locationId: dailyReport.locationId,
        overlapping,
      }
    })
    this.repo.saveTrace(result, userId)
    return result
  }
}
