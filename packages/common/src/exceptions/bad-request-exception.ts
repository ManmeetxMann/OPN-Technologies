import {DefaultHttpException} from './httpexception'
import {ResponseStatusCodes} from '../types/response-status'

export class BadRequestException extends DefaultHttpException {
  constructor(message: string) {
    super(message, 400, ResponseStatusCodes.Failed)
  }
}
