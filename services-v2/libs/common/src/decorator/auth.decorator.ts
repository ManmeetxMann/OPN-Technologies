import {ExecutionContext, createParamDecorator} from '@nestjs/common'

/**
 * Passes authUser object to the controller
 */
export const AuthUserDecorator = createParamDecorator((_, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest()
  return request.raw.locals?.authUser
})
