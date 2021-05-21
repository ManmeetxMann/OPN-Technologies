import {createParamDecorator, ExecutionContext} from '@nestjs/common'
import {OpnCommonHeaders} from '../types/authorization'

export const OpnHeaders = createParamDecorator(
  (_, ctx: ExecutionContext): OpnCommonHeaders => {
    const request = ctx.switchToHttp().getRequest()
    return {
      ...request.raw.commonHeaders,
    }
  },
)
