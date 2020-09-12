import {Request, Response, NextFunction} from 'express'

const loggerMiddleware = (req: Request, resp: Response, next: NextFunction): void => {
  const {headers, params, query, body} = req
  console.info(
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
