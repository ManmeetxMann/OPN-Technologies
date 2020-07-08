export type ResponseStatus = {
  code: string
  message: string
}

export type ResponseStatusCode = {

}

export enum ResponseStatusCodes {
  Succeed = 'succeed',
  Failed = 'failed',
  InternalServerError = 'internal_server_error',
  Unauthorized = 'unauthorized',
  AccessDenied = 'access_denied',
  ResourceNotFound = 'resource_not_found',
}
