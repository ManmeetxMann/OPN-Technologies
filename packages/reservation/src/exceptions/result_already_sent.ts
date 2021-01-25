import {ResponseStatusCodes} from '../../../common/src/types/response-status'

const DEFAULT_ERROR_MSG = "It's not you, it's us... Something went wrong."

export class ResultAlreadySentException extends Error {
  status: number
  code: string
  message: string

  constructor(
    message = DEFAULT_ERROR_MSG,
    status = 200,
    code = ResponseStatusCodes.ResourceAlreadyExists,
  ) {
    super(message)
    this.status = status
    this.message = message
    this.code = code
  }
}
