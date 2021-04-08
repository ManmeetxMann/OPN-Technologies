import {ApiProperty} from '@nestjs/swagger'
import {ResponseStatus, ResponseStatusCodes} from './response-status'

/**
 * Generic response wrapper.
 * Allows every response to be wrapped into a standard object that contains:
 * - a status
 * - the data (nullable)
 * - some pagination details if any.
 */
export class ResponseWrapper<T = unknown> {
  @ApiProperty()
  status: ResponseStatus

  @ApiProperty()
  data: T

  @ApiProperty()
  page?: number

  @ApiProperty()
  totalPages?: number

  @ApiProperty()
  totalItems?: number

  // eslint-disable-next-line max-params
  static of<T>(
    data: T,
    code: string,
    message: string = null,
    page?: number,
    totalPages?: number,
    totalItems?: number,
  ): ResponseWrapper<T> {
    return {
      data,
      status: {code, message},
      page,
      totalPages,
      totalItems,
    } as ResponseWrapper<T>
  }

  static actionSucceed<T>(data: T = null): ResponseWrapper<T> {
    return ResponseWrapper.of(data, ResponseStatusCodes.Succeed)
  }

  static actionFailed<T>(message?: string, data: T = null): ResponseWrapper<T> {
    return ResponseWrapper.of(data, ResponseStatusCodes.Failed, message)
  }
}
