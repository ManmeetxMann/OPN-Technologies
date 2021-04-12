import {HttpException} from '@opn/common/exception'
import {ResponseStatusCodes} from '@opn/common/dto'

export class BadRequestException extends HttpException {
  constructor(message: string) {
    super(message, 400, ResponseStatusCodes.Failed)
  }
}
