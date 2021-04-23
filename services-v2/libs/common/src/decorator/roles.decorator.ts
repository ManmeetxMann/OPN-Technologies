import {CustomDecorator, SetMetadata} from '@nestjs/common'
import {RequiredUserPermission} from '../types/authorization'

/**
 * Creates role metadata for AuthGuard to authorize user
 * @param requiredRoles
 * @param requireOrg
 */
export const Roles = (
  requiredRoles: RequiredUserPermission[],
  requireOrg = false,
): CustomDecorator => SetMetadata('roles', {requiredRoles, requireOrg})
