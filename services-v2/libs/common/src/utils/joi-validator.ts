import {ObjectSchema} from 'joi'
import {BadRequestException} from '../exception'
import {ValidatorEvents, ValidatorFunctions} from '../types/activity-logs'
import {LogWarning} from './logging'

/**
 * Wrapper for Joi validator to control errors and logging
 */
export class JoiValidator {
  private schema: ObjectSchema

  constructor(schema: ObjectSchema) {
    this.schema = schema
  }

  async validate<T>(data: T): Promise<T> {
    try {
      return await this.schema.validateAsync(data)
    } catch (error) {
      const formattedError = error.details.map(detail => detail.message).join(',')

      LogWarning(ValidatorFunctions.validate, ValidatorEvents.validationFailed, {
        data,
        error: formattedError,
      })

      throw new BadRequestException(formattedError)
    }
  }
}
