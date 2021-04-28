import {HttpException} from '@opn-services/common/exception'
import {ResponseStatusCodes} from '@opn-services/common/dto'

export class BadRequestException extends HttpException {
  constructor(message: string) {
    super(message, 400, ResponseStatusCodes.Failed)
  }
}
