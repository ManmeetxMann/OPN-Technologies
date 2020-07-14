import {ResponseStatusCodes} from '../types/response-status'
import {ResponseWrapper} from '../types/response-wrapper'

export const of = <T>(data: T, statusCode: string, message: string = null): ResponseWrapper<T> => ({
  data,
  status: {
    code: statusCode,
    message,
  },
})

export const actionSucceed = <T>(data: T = null): ResponseWrapper<T> =>
  of(data, ResponseStatusCodes.Succeed)

export const actionFailed = <T>(message?: string, data: T = null): ResponseWrapper<T> =>
  of(data, ResponseStatusCodes.Failed, message)
