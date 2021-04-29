import {DefaultHttpException} from './httpexception'
import {ResponseStatusCodes} from '../types/response-status'

export class ResourceNotFoundException extends DefaultHttpException {
  constructor(message: string) {
    super(message, 404, ResponseStatusCodes.ResourceNotFound)
  }
}
