import {ApiProperty} from '@nestjs/swagger'

/**
 * Generic response status
 */
export class ResponseStatus {
  @ApiProperty()
  code: ResponseStatusCodes | string

  @ApiProperty()
  message: string
}

/**
 * Default status codes
 */
export enum ResponseStatusCodes {
  Succeed = 'succeed',
  Failed = 'failed',
  ValidationError = 'validation_error',
  InternalServerError = 'internal_server_error',
  Unauthorized = 'unauthorized',
  AccessDenied = 'access_denied',
  ResourceNotFound = 'resource_not_found',
}
