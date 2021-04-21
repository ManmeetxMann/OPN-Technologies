import {createParamDecorator, ExecutionContext} from '@nestjs/common'
import {AuthUser} from '../model'

/**
 * Passes authUser object to the controller
 */
export const AuthUserDecorator = createParamDecorator(
  (_, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest()
    return request.raw.locals?.authUser as AuthUser
  },
)
