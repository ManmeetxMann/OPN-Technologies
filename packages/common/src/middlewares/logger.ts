import {Request, Response, NextFunction} from 'express'
import bunyan from 'bunyan'

// Imports the Google Cloud client library for Bunyan
import {LoggingBunyan} from '@google-cloud/logging-bunyan'

// Creates a Bunyan Cloud Logging client
const loggingBunyan = new LoggingBunyan()

const loggerMiddleware = (req: Request, resp: Response, next: NextFunction): void => {
  const {headers, params, query, body} = req
  const logger = bunyan.createLogger({
    name: 'my-service',
    streams: [
      // Log to the console at 'info' and above
      //{stream: process.stdout, level: 'info'},
      // And log to Cloud Logging, logging at 'info' and above
      loggingBunyan.stream('info'),
    ],
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
