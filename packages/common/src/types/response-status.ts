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
  ResourceAlreadyExists = 'resource_already_exists',
  ResultAlreadySent = 'result_already_sent',
  InProgress = 'in_progress',
}
