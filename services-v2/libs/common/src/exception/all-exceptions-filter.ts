import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common'

import {ResponseStatusCodes} from '@opn-services/common/dto'

/**
 * Changes error model response to match v1 validation model
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse()

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR

    let code = exception['response']['code']
    let message = exception['response']['message']
    if (Array.isArray(message)) {
      message = message.join(', ')
    }
    if (exception instanceof UnprocessableEntityException) {
      code = ResponseStatusCodes.ValidationError
    }

    response.status(status).send({
      data: null,
      status: {
        code,
        message,
      },
    })
  }
}
