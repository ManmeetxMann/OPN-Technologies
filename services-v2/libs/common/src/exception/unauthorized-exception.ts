import {HttpException} from '@opn-services/common/exception'
import {ResponseStatusCodes} from '@opn-services/common/dto'

export class UnauthorizedException extends HttpException {
  constructor(message: string) {
    super(message, 401, ResponseStatusCodes.Unauthorized)
  }
}
