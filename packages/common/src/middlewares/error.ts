import {HttpException} from '../exceptions/httpexception'
import {ResponseStatusCodes} from '../types/response-status'
import {ResponseWrapper} from '../types/response-wrapper'
import {ErrorMiddleware, Middleware} from '../types/middleware'
// import {ValidationError} from 'express-openapi-validator'

export const handleErrors: ErrorMiddleware<HttpException> = (
  err,
  req,
  res,
  // next,
) => {
  // format error
  res.status(err.status || 500).json({
    message: err.message,
  })
}

// Cannot have an error... to be used bottom of stack
export const handleRouteNotFound: Middleware = (req, resp) => {
  const status = 404
  const response: ResponseWrapper<null> = {
    data: null,
    status: {
      code: ResponseStatusCodes.ResourceNotFound,
      message: 'Not found',
    },
  }
  resp.status(status).json(response)
}
