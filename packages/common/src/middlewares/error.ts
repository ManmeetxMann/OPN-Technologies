import {HttpException} from '../exceptions/httpexception'
import {ResponseStatusCodes} from '../types/response-status'
import {ResponseWrapper} from '../types/response-wrapper'
import {ErrorMiddleware, Middleware} from '../types/middleware'
import {ValidationError} from 'express-openapi-validate'

export const handleErrors: ErrorMiddleware<HttpException | ValidationError> = (
  error,
  req,
  resp,
  next,
) => {
  console.error('Error!', error)
  if (error instanceof ValidationError) {
    const response: ResponseWrapper<null> = {
      data: null,
      status: {
        code: ResponseStatusCodes.ValidationError,
        message: error.message,
      },
    }
    resp.status(400).send(response)
    next()
    return
  }

  const {status, code, message} = error
  const response: ResponseWrapper<null> = {
    data: null,
    status: {
      code,
      message,
    },
  }
  if (status >= 100 && status < 600)
    resp.status(status).send(response)
  else
    resp.status(500).send(response)
  next()
  return
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
  resp.status(status).send(response)
}
