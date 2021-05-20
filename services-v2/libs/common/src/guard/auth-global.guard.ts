import {Injectable, CanActivate, ExecutionContext} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {UserService as UserServiceV1} from '@opn-common-v1/service/user/user-service'

import {LogInfo} from '../utils/logging'
import {ForbiddenException, UnauthorizedException} from '../exception'
import {AuthUser} from '../model'
import {opnHeadersSchema} from '../schemas'
import {FirebaseAuthService} from '../services'
import {
  AuthTypes,
  OpnCommonHeaders,
  OpnLang,
  OpnRawHeaders,
  OpnSources,
} from '../types/authorization'
import {JoiValidator} from '../utils/joi-validator'
import {OpnHeaderEvents, OpnHeaderFunctions} from '../types/activity-logs'

/**
 * Global auth guard to handle different types of auth based on handler metadata
 */
@Injectable()
export class AuthGlobalGuard implements CanActivate {
  private userService: UserServiceV1

  constructor(private firebaseAuthService: FirebaseAuthService, private reflector: Reflector) {
    this.userService = new UserServiceV1()
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest()
    req.raw.locals = {}

    const authType = this.reflector.get('AuthType', context.getHandler())

    switch (authType?.type) {
      case AuthTypes.Public:
        await this.validateHeaders(req)
        break
      case AuthTypes.Internal:
        await this.handleInternalAuth(req)
        break
      case AuthTypes.Firebase:
        await this.validateHeaders(req)
        await this.handleFirebaseAuth(req)
        break
      default:
        await this.validateHeaders(req)
        await this.handleDefaultAuth(req)
        break
    }

    return true
  }

  /**
   * Save decoded data from Firebase
   */
  private async handleFirebaseAuth(req): Promise<void> {
    const firebaseAuthUser = await this.getFirebaseUser(req)

    req.raw.locals = {
      firebaseAuthUser,
    }
  }

  /**
   * Save data required by Internal requests in locals
   */
  private async handleInternalAuth(req) {
    req.raw.locals = {
      opnSchedulerKey: req.headers['opn-scheduler-key'],
    }
  }

  /**
   * Read & validate bearer token from 'authorization' header
   */
  private async getBearer(req): Promise<string> {
    const bearerHeader = req.headers['authorization']
    if (!bearerHeader) {
      throw new UnauthorizedException('Authorization token required')
    }

    // Get the Bearer token and first sanity check
    const bearer = bearerHeader.split(' ')
    if (!bearer || bearer.length < 2 || bearer[0] == '' || bearer[0].toLowerCase() !== 'bearer') {
      throw new UnauthorizedException('Unexpected format for Authorization header')
    }

    const idToken = bearer[1]

    return idToken
  }

  /**
   * Read & validate Firebase token, decode user data
   */
  private async getFirebaseUser(req) {
    const idToken = await this.getBearer(req)

    const validatedAuthUser = await this.firebaseAuthService.verifyAuthToken(idToken)

    if (!validatedAuthUser) {
      throw new UnauthorizedException('Invalid access-token')
    }

    return validatedAuthUser
  }

  /**
   * Validate OPN headers, required by all requests except Internal
   */
  private async validateHeaders(req): Promise<OpnCommonHeaders> {
    const headers: OpnCommonHeaders = {
      opnDeviceIdHeader: req.headers[OpnRawHeaders.OpnDeviceId],
      opnSourceHeader: req.headers[OpnRawHeaders.OpnSource] as OpnSources,
      opnRequestIdHeader: req.headers[OpnRawHeaders.OpnRequestId],
      opnLangHeader: req.headers[OpnRawHeaders.OpnLang] as OpnLang,
      opnAppVersion: req.headers[OpnRawHeaders.OpnAppVersion],
    }

    LogInfo(OpnHeaderFunctions.validateHeaders, OpnHeaderEvents.ReadOpnHeaders, {headers})

    const headerValidator = new JoiValidator(opnHeadersSchema)
    const validHeaders = await headerValidator.validate(headers)

    req.raw.commonHeaders = {
      ...headers,
    }

    return validHeaders
  }

  /**
   * Default auth is similar to V1 middleware.
   * Attaches authUser Firetore DB user data, organizationId and labId
   */
  private async handleDefaultAuth(req) {
    const idToken = await this.getBearer(req)
    const validatedAuthUser = await this.firebaseAuthService.verifyAuthToken(idToken)

    if (!validatedAuthUser) {
      throw new UnauthorizedException('Invalid access-token')
    }

    // look up admin user for backwards compat
    const [regUser, legacyAdminUser] = await Promise.all([
      this.userService.findOneByAuthUserId(validatedAuthUser.uid),
      this.userService.findOneByAdminAuthUserId(validatedAuthUser.uid),
    ])

    let user: AuthUser | null = null
    if (regUser) {
      user = {...regUser, authUserId: regUser.authUserId.toString()}
      if (legacyAdminUser && legacyAdminUser.id !== user.id) {
        console.warn(`Two users found for authUserId ${validatedAuthUser.uid}, using ${regUser.id}`)
      }
    } else if (legacyAdminUser) {
      console.warn(`Using legacy admin.authUserId for authUserId ${validatedAuthUser.uid}`)
      user = {...legacyAdminUser, authUserId: legacyAdminUser.authUserId.toString()}
    }

    if (!user) {
      throw new ForbiddenException(`Cannot find user with authUserId [${validatedAuthUser.uid}]`)
    }

    const connectedUser: AuthUser = user

    const organizationId =
      (req.query?.organizationId as string) ??
      (req.params?.organizationId as string) ??
      (req.raw.body?.organizationId as string) ??
      // headers are coerced to lowercase
      (req.raw.headers?.organizationid as string) ??
      null

    const labId =
      (req.query?.labId as string) ??
      (req.params?.labId as string) ??
      (req.raw.body?.labId as string) ??
      // headers are coerced to lowercase
      (req.headers?.labid as string) ??
      null

    // Set it for the actual route
    // res.locals.connectedUser = connectedUser // TODO to be replaced with `authenticatedUser`
    req.raw.locals.authUser = {
      ...connectedUser,
      requestOrganizationId: organizationId,
      requestLabId: labId,
    } as AuthUser
  }
}
