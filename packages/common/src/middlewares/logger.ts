import {Request, Response, NextFunction} from 'express'
import {LogInfo} from '../utils/logging-setup'

const loggerMiddleware = (req: Request, resp: Response, next: NextFunction): void => {
  const {headers, params, query, body} = req
  LogInfo('loggerMiddleware', 'RequestLog', {
    method: req.method,
    path: req.path,
    params,
    query,
    body,
    headers,
  })

  next()
}

export default loggerMiddleware
