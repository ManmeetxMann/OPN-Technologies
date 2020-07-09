import {HttpException} from '../exceptions/httpexception'
import {ResponseStatusCodes} from '../types/response-status'
import {ResponseWrapper} from '../types/response-wrapper'
import {ErrorMiddleware, Middleware} from '../types/middleware'

export const handleHttpException: ErrorMiddleware<HttpException> = (error, req, resp, _next) => {
  console.log('Error!')
  console.error(error)

  const {status, code, message} = error
  const response: ResponseWrapper<null> = {
    data: null,
    status: {
      code,
      message,
    },
  }
  resp.status(status).send(response)
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
