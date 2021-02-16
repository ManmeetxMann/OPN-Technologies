import {Request, Response, NextFunction} from 'express'
import bunyan from 'bunyan'

// Imports the Google Cloud client library for Bunyan
import { LoggingBunyan } from '@google-cloud/logging-bunyan'

// Creates a Bunyan Cloud Logging client
const loggingBunyan = new LoggingBunyan();

const loggerMiddleware = (req: Request, resp: Response, next: NextFunction): void => {
  const logger = bunyan.createLogger({
    // The JSON payload of the log as it appears in Cloud Logging
    // will contain "name": "my-service"
    name: 'my-service',
    streams: [
      // Log to the console at 'info' and above
      {stream: process.stdout, level: 'info'},
      // And log to Cloud Logging, logging at 'info' and above
      loggingBunyan.stream('info'),
    ],
  });
  const {headers, params, query, body} = req
  logger.info(
    'Request logged:',
    req.method,
    req.path,
    JSON.stringify({
      params,
      query,
      body,
      auth: headers?.authorization,
    }),
  )
  next()
}

export default loggerMiddleware
