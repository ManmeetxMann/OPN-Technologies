import {
  ArgumentMetadata,
  ValidationPipe,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common'

/**
 * Trows UnprocessableEntityException insted of BadRequestException so
 * AllExceptionsFilter can return appropriate code to the client
 */
export class OpnValidationPipe extends ValidationPipe {
  public async transform(value: unknown, metadata: ArgumentMetadata): Promise<void> {
    try {
      return await super.transform(value, metadata)
    } catch (e) {
      // Create string for array of validation string
      const message = e.response?.message

      if (e instanceof BadRequestException) {
        throw new UnprocessableEntityException(message)
      }

      console.error('Unknown ValidationPipe Exception')
    }
  }
}
