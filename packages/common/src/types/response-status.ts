export type ResponseStatus = {
  code: string
  message?: string
}

export enum ResponseStatusCodes {
  Succeed = 'succeed',
  Failed = 'failed',
  ValidationError = 'validation_error',
  InternalServerError = 'internal_server_error',
  Unauthorized = 'unauthorized',
  AccessDenied = 'access_denied',
  ResourceNotFound = 'resource_not_found',
}
