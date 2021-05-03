import {DefaultHttpException} from '@opn-services/common/exception'
import {ResponseStatusCodes} from '@opn-services/common/dto'

export class ResourceNotFoundException extends DefaultHttpException {
  constructor(message: string) {
    super(message, 404, ResponseStatusCodes.ResourceNotFound)
  }
}
