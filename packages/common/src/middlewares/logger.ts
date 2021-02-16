import {Request, Response, NextFunction} from 'express'
import bunyan from 'bunyan'

// Imports the Google Cloud client library for Bunyan
import {LoggingBunyan} from '@google-cloud/logging-bunyan'

// Creates a Bunyan Cloud Logging client
const loggingBunyan = new LoggingBunyan()

const loggerMiddleware = (req: Request, resp: Response, next: NextFunction): void => {
  const {headers, params, query, body} = req
  const logStreams = []
  console.log(process.env.NODE_ENV)
  if (process.env.NODE_ENV === 'production') {
    logStreams.push(loggingBunyan.stream('info'))
  }else{
    logStreams.push({stream: process.stdout, level: 'info'})
  }

  const logger = bunyan.createLogger({
    name: headers.host,
    streams: logStreams,
  })

  logger.info({
    method: req.method,
    path: req.path,
    params,
    query,
    body,
    headers,
  })

  resp.locals.logger = logger
  next()
}

export default loggerMiddleware
