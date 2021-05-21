import {CustomDecorator, SetMetadata} from '@nestjs/common'
import {AuthTypes} from '../types/authorization'

/**
 * Auth type decorator for controller method.
 * Endpoint auth will be handled in GlobalAuthGuard based on AuthType
 * @param type
 */
export const ApiAuthType = (type: AuthTypes): CustomDecorator => SetMetadata('AuthType', {type})
