import {DefaultHttpException} from '@opn-services/common/exception'
import {ResponseStatusCodes} from '@opn-services/common/dto'

export class UnauthorizedException extends DefaultHttpException {
  constructor(message: string) {
    super(message, 401, ResponseStatusCodes.Unauthorized)
  }
}
