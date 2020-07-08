import {HttpException} from './httpexception'
import {ResponseStatusCodes} from '../types/response-status'

export class UnauthorizedException extends HttpException {
  constructor(message: string) {
    super(401, ResponseStatusCodes.Unauthorized, message)
  }
}
