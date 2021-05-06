import {ForbiddenException, Injectable, NestMiddleware} from '@nestjs/common'
import {UnauthorizedException} from '@opn-services/common/exception'
import {OpnConfigService} from '@opn-services/common/services'

import {FirebaseAuthService} from '@opn-services/common/services/firebase/firebase-auth.service'

import {AuthUser} from '../model'
import {UserService as UserServiceV1} from '@opn-common-v1/service/user/user-service'
import {
  internalUrls,
  publicApiUrls,
} from '@opn-services/cart/configuration/middleware.configuration'

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private userService: UserServiceV1

  constructor(
    private firebaseAuthService: FirebaseAuthService,
    private configService: OpnConfigService,
  ) {
    this.userService = new UserServiceV1()
  }

  /* eslint-disable  @typescript-eslint/explicit-module-boundary-types */
  /* eslint-disable complexity */
  private async validateAuth(req, res, next) {
    const bearerHeader = req.headers['authorization']
    if (internalUrls.includes(req.originalUrl)) {
      req.locals = {}
      req.locals = {
        opnSchedulerKey: req.headers['opn-scheduler-key'],
      }
      return next()
    }
    if (!bearerHeader) {
      throw new UnauthorizedException('Authorization token required')
    }

    // Get the Bearer token and first sanity check
    const bearer = bearerHeader.split(' ')
    if (!bearer || bearer.length < 2 || bearer[0] == '' || bearer[0].toLowerCase() !== 'bearer') {
      throw new UnauthorizedException('Unexpected format for Authorization header')
    }

    const idToken = bearer[1]
    // Validate
    const validatedAuthUser = await this.firebaseAuthService.verifyAuthToken(idToken)
    if (publicApiUrls.includes(req.originalUrl)) {
      req.locals = {}
      req.locals = {
        firebaseAuthUser: validatedAuthUser,
      }
      return next()
    }

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
      (req.body?.organizationId as string) ??
      // headers are coerced to lowercase
      (req.headers?.organizationid as string) ??
      null

    const labId =
      (req.query?.labId as string) ??
      (req.params?.labId as string) ??
      (req.body?.labId as string) ??
      // headers are coerced to lowercase
      (req.headers?.labid as string) ??
      null

    // Set it for the actual route
    // res.locals.connectedUser = connectedUser // TODO to be replaced with `authenticatedUser`
    req.locals = {}
    req.locals.authUser = {
      ...connectedUser,
      requestOrganizationId: organizationId,
      requestLabId: labId,
    } as AuthUser

    // Done
    next()
  }

  async use(req, res, next) {
    // Allow Swagger
    if ((req.originalUrl as string).startsWith('/api/doc/')) {
      const userPass = new Buffer(
        (req.headers.authorization || '').split(' ')[1] || '',
        'base64',
      ).toString()

      const configUserPass = this.configService.get('APIDOCS_PASSWORD_V2')
      if (userPass != configUserPass) {
        res.writeHead(401, {'WWW-Authenticate': 'Basic realm="nope"'})
        res.end('HTTP Error 401 Unauthorized: Access is denied')
      }
      return next()
    }

    try {
      await this.validateAuth(req, res, next)
    } catch (error) {
      next(error)
    }
  }
}
