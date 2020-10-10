import {HttpException} from './httpexception'
import {ResponseStatusCodes} from '../types/response-status'

export class ResourceAlreadyExistsException extends HttpException {
  constructor(id: string, message?: string) {
    super(
      message ?? `Resource [${id}] already exists`,
      409,
      ResponseStatusCodes.ResourceAlreadyExists,
    )
  }
}
