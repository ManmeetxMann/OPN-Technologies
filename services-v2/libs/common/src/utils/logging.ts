//import * as debugClient from '@google-cloud/debug-agent'
//debugClient.start({allowExpressions: true})
import * as traceClient from '@google-cloud/trace-agent'
import * as bunyan from 'bunyan'
import {LoggingBunyan} from '@google-cloud/logging-bunyan'
import {GAEService, NodeEnv} from './google-cloud'

// Creates a Bunyan Cloud Logging client
const loggingBunyan = new LoggingBunyan()

const logStreams = []
if (NodeEnv() === 'production') {
  logStreams.push(loggingBunyan.stream('info'))
} else {
  logStreams.push({stream: process.stdout, level: 'info'})
}

const Logger = bunyan.createLogger({
  name: GAEService(),
  streams: logStreams,
})

if (NodeEnv() === 'production') {
  traceClient.start({
    samplingRate: 5, // sample 5 traces per second, or at most 1 every 200 milliseconds.
    ignoreUrls: [/^\/ignore-me/],
    ignoreMethods: ['options'], // ignore requests with OPTIONS method (case-insensitive).
  })
}
export type LogMetaData = {
  appointmentID?: string
  appointmentDateTime?: string
  appointmentStatus?: string
  appointmentBarCode?: string
  acuityID?: number
  acuityStatusCode?: string
  errorMessage?: string
  packageCode?: string
  reportTrackerId?: string
  testResultId?: string
  testRunId?: string
  organizationId?: string
  requestedOrganization?: string
}

export const LogInfo = (
  functionName: string,
  eventName: string,
  data: Record<string, unknown>,
): void => {
  Logger.info({functionName, eventName, ...data})
}

export const LogWarning = (
  functionName: string,
  eventName: string,
  data: Record<string, unknown>,
): void => {
  Logger.warn({functionName, eventName, ...data})
}

export const LogError = (functionName: string, eventName: string, data: LogMetaData): void => {
  Logger.error({functionName, eventName, ...data})
}
//fatal
