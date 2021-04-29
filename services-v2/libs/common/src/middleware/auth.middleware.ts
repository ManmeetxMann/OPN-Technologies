import {ForbiddenException, Injectable, NestMiddleware, UnauthorizedException} from '@nestjs/common'
import {ConfigService} from '@nestjs/config'

import {FirebaseAuthService} from '@opn-services/common/services/auth/firebase-auth.service'

import {User} from '@opn-common-v1/data/user'
import {UserService as UserServiceV1} from '@opn-common-v1/service/user/user-service'
import { internalUrls, publicApiUrls } from "@opn-services/cart/configuration/middleware.configuration";

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private userService: UserServiceV1

  constructor(
    private firebaseAuthService: FirebaseAuthService,
    private configService: ConfigService,
  ) {
    this.userService = new UserServiceV1()
  }

  /* eslint-disable complexity */
  private async validateAuth(req, res, next) {
    const bearerHeader = req.headers['authorization']
    if (internalUrls.includes(req.url)) {
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

    if (publicApiUrls.includes(req.url)) {
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
    let user: User | null = null
    if (regUser) {
      user = regUser
      if (legacyAdminUser && legacyAdminUser.id !== user.id) {
        console.warn(`Two users found for authUserId ${validatedAuthUser.uid}, using ${regUser.id}`)
      }
    } else if (legacyAdminUser) {
      console.warn(`Using legacy admin.authUserId for authUserId ${validatedAuthUser.uid}`)
      user = legacyAdminUser
    }

    if (!user) {
      throw new ForbiddenException(`Cannot find user with authUserId [${validatedAuthUser.uid}]`)
    }

    const connectedUser: User = user

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
    }

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

      const configUserPass = this.configService.get('SWAGGER_BASIC_AUTH_CREDENTIALS')
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
