import {HttpException} from '../exceptions/httpexception'
import {ResponseStatusCodes} from '../types/response-status'
import {ResponseWrapper} from '../types/response-wrapper'
import {ErrorMiddleware, Middleware} from '../types/middleware'
import {ValidationError} from 'express-openapi-validate'

export const handleErrors: ErrorMiddleware<HttpException | ValidationError> = (
  error,
  req,
  resp,
  _next,
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
    return resp.status(400).send(response)
  }

  const {status, code, message} = error
  const response: ResponseWrapper<null> = {
    data: null,
    status: {
      code,
      message,
    },
  }
  return resp.status(status).send(response)
}

// Cannot have an error... to be used bottom of stack
export const handleRouteNotFound: Middleware = (req, resp, _next) => {
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
