import {CanActivate, ExecutionContext, Injectable} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {InternalAuthTypes} from '@opn-services/common/types/authorization'
import {ConfigService} from '@nestjs/config'

@Injectable()
export class InternalGuard implements CanActivate {
  constructor(private reflector: Reflector, private configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const authType: {internalAuthType: InternalAuthTypes} = this.reflector.get(
      'internalAuthType',
      context.getHandler(),
    )
    const req = context.switchToHttp().getRequest()
    return this.validateInternalAuth(req.raw.locals, authType.internalAuthType)
  }

  private async validateInternalAuth(
    locals: {opnSchedulerKey?: InternalAuthTypes},
    authType: InternalAuthTypes,
  ) {
    if (
      authType === InternalAuthTypes.OpnSchedulerKey &&
      locals.opnSchedulerKey !== this.configService.get('OPN_SCHEDULER_KEY')
    ) {
      return false
    }
    return true
  }
}
