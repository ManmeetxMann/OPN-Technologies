import {HttpException} from './httpexception'
import {ResponseStatusCodes} from '../types/response-status'

export class ForbiddenException extends HttpException {
  constructor(message: string) {
    super(message, 403, ResponseStatusCodes.AccessDenied)
  }
}
