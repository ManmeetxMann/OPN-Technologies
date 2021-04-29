import {DefaultHttpException} from './httpexception'
import {ResponseStatusCodes} from '../types/response-status'

export class ForbiddenException extends DefaultHttpException {
  constructor(message: string) {
    super(message, 403, ResponseStatusCodes.AccessDenied)
  }
}
