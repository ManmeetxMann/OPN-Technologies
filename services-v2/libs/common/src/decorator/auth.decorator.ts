import {createParamDecorator, ExecutionContext} from '@nestjs/common'

/**
 * Passes authUser object to the controller
 */
export const AuthUserDecorator = createParamDecorator((_, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest()
  return request.locals?.authUser
})
