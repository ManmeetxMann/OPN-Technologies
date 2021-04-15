import {HttpException} from '@opn/common/exception'
import {ResponseStatusCodes} from '@opn/common/dto'

export class UnauthorizedException extends HttpException {
  constructor(message: string) {
    super(message, 401, ResponseStatusCodes.Unauthorized)
  }
}
