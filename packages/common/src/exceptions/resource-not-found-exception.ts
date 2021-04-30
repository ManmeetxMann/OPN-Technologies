import {HttpException} from './httpexception'
import {ResponseStatusCodes} from '../types/response-status'

export class ResourceNotFoundException extends HttpException {
  constructor(message: string) {
    super(message, 404, ResponseStatusCodes.ResourceNotFound)
  }
}
