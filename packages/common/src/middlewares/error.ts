import {HttpException} from '../exceptions/httpexception'
import {ResponseStatusCodes} from '../types/response-status'
import {ResponseWrapper} from '../types/response-wrapper'
import {ErrorMiddleware, Middleware} from '../types/middleware'
import {BadRequest} from 'express-openapi-validator'

// express checks if 'next' is in the signature. DO NOT call next
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handleErrors: ErrorMiddleware<HttpException> = (err, req, res, _next) => {
  console.error('Error: ', err)
  // format error
  const {status, code, message} = err
  const response: ResponseWrapper<null> = {
    data: null,
    status: {
      code,
      message,
    },
  }
  res.status(status).json(response)
  return
}

const combinePropertyErrors = (extra: string[], missing: string[]): string => {
  const lines = []
  if (extra.length) {
    lines.push(`Unexpected properties: ${extra.join(', ')}`)
  }
  if (missing.length) {
    lines.push(`Missing properties: ${missing.join(', ')}`)
  }
  return lines.join('    ')
}

// express checks if 'next' is in the signature. DO NOT call next
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handleValidationErrors: ErrorMiddleware<BadRequest> = (err, req, res, _next) => {
  console.error('Validation Error: ', err)
  const {errors} = err
  const extraProperties = errors
    .filter((error) => error.message === 'should NOT have additional properties')
    .map((error) => error.path)
  const missingProperties = errors
    .filter((error) => error.message.startsWith('should have required property '))
    .map((error) => error.path)
  res.status(err.status || 500).json({
    message: combinePropertyErrors(extraProperties, missingProperties),
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
