//import * as debugClient from '@google-cloud/debug-agent'
//debugClient.start({allowExpressions: true})
import * as traceClient from '@google-cloud/trace-agent'
import bunyan from 'bunyan'
import {LoggingBunyan} from '@google-cloud/logging-bunyan'
import {NodeEnV, GAEService} from './app-engine-environment'

// Creates a Bunyan Cloud Logging client
const loggingBunyan = new LoggingBunyan()

const logStreams = []
if (NodeEnV() === 'production') {
  logStreams.push(loggingBunyan.stream('info'))
} else {
  logStreams.push({stream: process.stdout, level: 'info'})
}

const Logger = bunyan.createLogger({
  name: GAEService(),
  streams: logStreams,
})

if (NodeEnV() === 'production') {
  traceClient.start({
    samplingRate: 5, // sample 5 traces per second, or at most 1 every 200 milliseconds.
    ignoreUrls: [/^\/ignore-me/],
    ignoreMethods: ['options'], // ignore requests with OPTIONS method (case-insensitive).
  })
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

export const LogError = (
  functionName: string,
  eventName: string,
  data: Record<string, unknown>,
): void => {
  Logger.error({functionName, eventName, ...data})
}
//fatal
