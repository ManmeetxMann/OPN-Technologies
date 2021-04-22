import {ResponseStatusCodes} from '@opn-services/common/dto'
import {HttpException} from '@opn-services/common/exception'

export class ForbiddenException extends HttpException {
  constructor(message: string) {
    super(message, 403, ResponseStatusCodes.Unauthorized)
  }
}
