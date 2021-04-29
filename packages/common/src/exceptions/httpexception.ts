import {HttpException} from '@nestjs/common'
import {ResponseStatusCodes} from '../types/response-status'

const DEFAULT_ERROR_MSG = "It's not you, it's us... Something went wrong."

export class DefaultHttpException extends HttpException {
  constructor(
    message = DEFAULT_ERROR_MSG,
    status = 500,
    code = ResponseStatusCodes.InternalServerError,
  ) {
    super(
      {
        statusCode: status,
        message,
        code,
      },
      status,
    )
  }
}
