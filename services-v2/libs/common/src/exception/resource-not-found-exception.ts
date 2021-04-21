import {HttpException} from '@opn-services/common/exception'
import {ResponseStatusCodes} from '@opn-services/common/dto'

export class ResourceNotFoundException extends HttpException {
  constructor(message: string) {
    super(message, 404, ResponseStatusCodes.ResourceNotFound)
  }
}
