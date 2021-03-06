import {ResponseStatusCodes} from '../types/response-status'

const DEFAULT_ERROR_MSG = "It's not you, it's us... Something went wrong."

export class HttpException extends Error {
  status: number
  code: string
  message: string

  constructor(
    message = DEFAULT_ERROR_MSG,
    status = 500,
    code = ResponseStatusCodes.InternalServerError,
  ) {
    super(message)
    this.status = status
    this.message = message
    this.code = code
  }
}
