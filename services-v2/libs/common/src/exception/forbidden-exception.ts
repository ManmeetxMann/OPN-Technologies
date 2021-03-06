import {ResponseStatusCodes} from '@opn-services/common/dto'
import {DefaultHttpException} from '@opn-services/common/exception'

export class ForbiddenException extends DefaultHttpException {
  constructor(message: string) {
    super(message, 403, ResponseStatusCodes.Unauthorized)
  }
}
