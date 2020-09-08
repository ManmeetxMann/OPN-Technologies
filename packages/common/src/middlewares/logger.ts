import {Request, Response, NextFunction} from 'express'

const loggerMiddleware = (req: Request, resp: Response, next: NextFunction): void => {
  console.log('Request logged:', req.method, req.path)
  const {headers, params, query, body} = req
  console.info('request details:', {params, query, body, auth: headers?.authorization})
  next()
}

export default loggerMiddleware
