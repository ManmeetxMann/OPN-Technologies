import moment from 'moment'

import TraceRepository from '../repository/trace.repository'
import type {ExposureReport} from '../repository/trace.repository'
import type {Access} from '../models/access'
import DataStore from '../../../common/src/data/datastore'
import {PubSub} from '@google-cloud/pubsub'
import {Config} from '../../../common/src/utils/config'

type Overlap = {
  start: Date
  end: Date
}

const overlap = (a: Access, b: Access, latestTime: number): Overlap | null => {
  const latestStart = a.enteredAt > b.enteredAt ? a.enteredAt : b.enteredAt
  const end1 = a.exitAt ?? {toDate: () => new Date(latestTime)}
  const end2 = b.exitAt ?? {toDate: () => new Date(latestTime)}
  const earliestEnd = end1 < end2 ? end1 : end2
  if (latestStart < earliestEnd) {
    return null
  }
  return {
    start: (a.enteredAt < b.enteredAt ? b : a).enteredAt.toDate(),
    end: (a.exitAt > b.exitAt ? b : a).exitAt.toDate(),
  }
}

const topicName = Config.get('PUBSUB_TRACE_TOPIC')
const subscriptionName = Config.get('PUBSUB_TRACE_SUBSCRIPTION')
const A_DAY = 24 * 60 * 60 * 1000

// When triggered, this creates a trace
export default class TraceListener {
  repo: TraceRepository
  constructor(dataStore: DataStore) {
    this.repo = new TraceRepository(dataStore)
  }

  async subscribe(): Promise<void> {
    const listener = new PubSub()
    try {
      await listener.createTopic(topicName)
    } catch (error) {
      // already created is an acceptable error here
      if (error.code !== 6) {
        throw error
      }
    }
    try {
      await listener.createSubscription(topicName, subscriptionName)
    } catch (error) {
      // already created is an acceptable error here
      if (error.code !== 6) {
        throw error
      }
    }

    const traceSub = listener.subscription(subscriptionName)
    traceSub.on('message', (message) => {
      const {data, attributes} = message
      const payload = Buffer.from(data, 'base64').toString()
      message.ack()
      if (payload !== 'trace-required') {
        return
      }
      const {userId, severity} = attributes
      const startTime = parseInt(attributes.startTime, 10)
      const endTime = parseInt(attributes.endTime, 10)
      this.traceFor(userId, startTime, endTime, severity)
    })
  }

  async traceFor(
    userId: string,
    startTime: number,
    endTime: number,
    severity: string,
  ): Promise<ExposureReport[]> {
    // because of time zones we might be interested in other dates
    const earliestDate = moment(startTime - A_DAY).format('YYYY-MM-DD')
    const latestDate = moment(endTime + A_DAY).format('YYYY-MM-DD')

    const accesses = await this.repo.getAccesses(userId, earliestDate, latestDate)
    const result = accesses.map((dailyReport) => {
      const mainUser = dailyReport.accesses.filter((access) => access.userId === userId)
      const otherUsers = dailyReport.accesses.filter((access) => access.userId !== userId)
      const dateObj = new Date(dailyReport.date)
      dateObj.setDate(dateObj.getDate() + 1)
      const endOfDay = dateObj.valueOf()
      // TODO: this could be made more efficient with some sorting
      const overlapping = otherUsers
        .map((access) =>
          mainUser
            .map((contaminated) => overlap(contaminated, access, endOfDay))
            .filter(
              (range) =>
                range && range.end.valueOf() > startTime && range.start.valueOf() < endTime,
            )
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
    this.repo.saveTrace(result, userId, severity)
    return result
  }
}
