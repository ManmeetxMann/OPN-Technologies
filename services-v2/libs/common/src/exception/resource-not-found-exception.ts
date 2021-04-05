import {HttpException} from '@opn/common/exception'
import {ResponseStatusCodes} from '@opn/common/dto'

export class ResourceNotFoundException extends HttpException {
  constructor(message: string) {
    super(message, 404, ResponseStatusCodes.ResourceNotFound)
  }
}
