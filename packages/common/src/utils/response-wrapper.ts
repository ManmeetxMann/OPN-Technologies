import {ResponseStatusCodes} from '../types/response-status'
import {ResponseWrapper} from '../types/response-wrapper'

export const of = <T>(
  data: T,
  statusCode: string,
  message: string = null,
  page = 0,
): ResponseWrapper<T> => ({
  data,
  status: {
    code: statusCode,
    message,
  },
  page,
})
export const actionSuccess = <T>(data: T = null, message = ''): ResponseWrapper<T> =>
  of(data, ResponseStatusCodes.Succeed, message)

export const actionSucceed = <T>(data: T = null, page = 0): ResponseWrapper<T> =>
  of(data, ResponseStatusCodes.Succeed, null, page)

export const actionFailed = <T>(message?: string, data: T = null): ResponseWrapper<T> =>
  of(data, ResponseStatusCodes.Failed, message)

export const actionReplyInsufficientPermission = <T>(data: T = null): ResponseWrapper<T> =>
  of(data, ResponseStatusCodes.Failed, 'Insufficient permissions to fulfil the request')

export const actionInProgress = <T>(data: T = null): ResponseWrapper<T> =>
  of(data, ResponseStatusCodes.InProgress, null)
