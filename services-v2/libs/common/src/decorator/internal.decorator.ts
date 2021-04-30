import {CustomDecorator, SetMetadata} from '@nestjs/common'
import {InternalAuthTypes} from '../types/authorization'

/**
 * Creates role metadata for AuthGuard to authorize user
 * @param internalAuthType
 */
export const InternalType = (internalAuthType: InternalAuthTypes): CustomDecorator =>
  SetMetadata('internalAuthType', {internalAuthType})
