import {HttpException} from './httpexception'
import {ResponseStatusCodes} from '../types/response-status'

export class BadRequestException extends HttpException {
  constructor(message: string) {
    super(400, ResponseStatusCodes.Failed, message)
  }
}
