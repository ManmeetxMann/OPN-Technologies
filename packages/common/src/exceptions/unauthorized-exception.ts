import {DefaultHttpException} from './httpexception'
import {ResponseStatusCodes} from '../types/response-status'

export class UnauthorizedException extends DefaultHttpException {
  constructor(message: string) {
    super(message, 401, ResponseStatusCodes.Unauthorized)
  }
}
