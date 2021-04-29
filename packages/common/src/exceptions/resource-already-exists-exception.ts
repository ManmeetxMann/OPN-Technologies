import {DefaultHttpException} from './httpexception'
import {ResponseStatusCodes} from '../types/response-status'

export class ResourceAlreadyExistsException extends DefaultHttpException {
  constructor(id: string, message?: string) {
    super(
      message ?? `Resource [${id}] already exists`,
      409,
      ResponseStatusCodes.ResourceAlreadyExists,
    )
  }
}
