import {ResponseStatusCodes} from '@opn/common/dto'
import {HttpException} from '@opn/common/exception'

export class ForbiddenException extends HttpException {
  constructor(message: string) {
    super(message, 403, ResponseStatusCodes.Unauthorized)
  }
}
