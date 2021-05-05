import {ExecutionContext, createParamDecorator} from '@nestjs/common'
import {AuthUser} from '@opn-services/common/services/firebase/firebase-auth.service'

/**
 * Passes firebaseAuthUser object to the controller
 */
export const PublicDecorator = createParamDecorator(
  (_, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest()
    return request.raw.locals?.firebaseAuthUser
  },
)
