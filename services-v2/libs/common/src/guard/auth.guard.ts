import {CanActivate, ExecutionContext} from '@nestjs/common'

// import {FirebaseAuthService} from '@opn-services/common/services/auth/firebase-auth.service'
/**
 * TODO:
 * 1. Handle roles
 */
export class AuthGuard implements CanActivate {
  async canActivate(_: ExecutionContext): Promise<boolean> {
    // const roles = this.reflector.get<string>('roles', context.getHandler())
    // if (!roles) {
    //   return true
    // }
    // const req = context.switchToHttp().getRequest()

    return true
  }
}
