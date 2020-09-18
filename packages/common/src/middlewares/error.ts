import {HttpException} from '../exceptions/httpexception'
import {ResponseStatusCodes} from '../types/response-status'
import {ResponseWrapper} from '../types/response-wrapper'
import {ErrorMiddleware, Middleware} from '../types/middleware'
import {BadRequest} from 'express-openapi-validator'

export const handleErrors: ErrorMiddleware<HttpException> = (err, req, res, next) => {
  // format error
  res.status(err.status || 500).json({
    // message: err.message,
    message: JSON.stringify(err),
  })
  next()
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

export const handleValidationErrors: ErrorMiddleware<BadRequest> = (err, req, res, next) => {
  const {errors} = err
  const extraProperties = errors
    .filter((error) => error.message === 'should NOT have additional properties')
    .map((error) => error.path)
  const missingProperties = errors
    .filter((error) => error.message.startsWith('should have required property '))
    .map((error) => error.path)
  // @ts-ignore
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
