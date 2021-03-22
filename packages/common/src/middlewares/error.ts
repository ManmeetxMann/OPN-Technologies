import {HttpException} from '../exceptions/httpexception'
import {ResponseStatusCodes} from '../types/response-status'
import {ResponseWrapper} from '../types/response-wrapper'
import {ErrorMiddleware, Middleware} from '../types/middleware'
import {BadRequest} from 'express-openapi-validator/dist/framework/types'

// express checks if 'next' is in the signature. DO NOT call next
export const handleErrors: ErrorMiddleware<HttpException | BadRequest> = (err, req, res, next) => {
  if ((err as BadRequest).errors) {
    handleValidationErrors(err as BadRequest, req, res, next)
    return
  }
  console.error('Error: ', err)
  // format error
  const {status, code, message} = err as HttpException
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

export const handleValidationErrors: ErrorMiddleware<BadRequest> = (err, req, res, next) => {
  console.error('Validation Error: ', err)
  const {errors} = err
  if (err.status === 404) {
    return next()
  }

  const extraProperties = (errors ?? [])
    .filter(
      (error) =>
        error.message === 'should NOT have additional properties' ||
        error.message.startsWith('Unknown'),
    )
    .map((error) => error.path)
  const missingProperties = (errors ?? [])
    .filter((error) => error.message.startsWith('should have required property '))
    .map((error) => error.path)
  const message = combinePropertyErrors(extraProperties, missingProperties)
  if (extraProperties.length && !missingProperties.length) {
    console.warn(
      `request ${req.path} allowing additional properties ${message}. Consider adding them as deprecated properties and inform the frontend team of the error`,
    )
    next()
  } else {
    const response: ResponseWrapper<null> = {
      data: null,
      status: {
        code: ResponseStatusCodes.ValidationError,
        message,
      },
    }
    res.status(400).json(response)
  }
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
