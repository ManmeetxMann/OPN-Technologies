import {Inject, CanActivate, ExecutionContext} from '@nestjs/common'

// import {FirebaseAuthService} from '@opn-services/common/services/auth/firebase-auth.service'
/**
 * TODO:
 * 1. Handle roles
 */
export class AuthGuard implements CanActivate {
  constructor() {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // const roles = this.reflector.get<string>('roles', context.getHandler())
    // if (!roles) {
    //   return true
    // }
    const req = context.switchToHttp().getRequest()

    //
    return true
  }
}
