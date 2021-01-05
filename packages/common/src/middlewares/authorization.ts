import {NextFunction, Request, Response} from 'express'

import {AuthService} from '../service/auth/auth-service'
import {UserService} from '../service/user/user-service'
import {of} from '../utils/response-wrapper'
import {ResponseStatusCodes} from '../types/response-status'
import {UserRoles} from '../types/authorization'
import {User} from '../data/user'

export const authorizationMiddleware = (allowedRoles?: UserRoles[]) => async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const listOfAllowedRoles = allowedRoles ?? [UserRoles.RegUser]

  const bearerHeader = req.headers['authorization']
  if (!bearerHeader) {
    res.status(401).json(of(null, ResponseStatusCodes.Unauthorized, 'Authorization token required'))
    return
  }

  // Get the Bearer token and first sanity check
  const bearer = bearerHeader.split(' ')
  if (!bearer || bearer.length < 2 || bearer[0] == '' || bearer[0].toLowerCase() !== 'bearer') {
    // Forbidden
    res
      .status(401)
      .json(
        of(null, ResponseStatusCodes.Unauthorized, 'Unexpected format for Authorization header'),
      )
    return
  }

  const idToken = bearer[1]

  // Validate
  const authService = new AuthService()
  const validatedAuthUser = await authService.verifyAuthToken(idToken)
  if (!validatedAuthUser) {
    res.status(401).json(of(null, ResponseStatusCodes.Unauthorized, 'Invalid access-token'))
    return
  }

  const userService = new UserService()
  let connectedUser: User
  const seekAdminAuth = listOfAllowedRoles.includes(UserRoles.OrgAdmin || UserRoles.SuperAdmin)
  const seekRegularAuth = listOfAllowedRoles.includes(UserRoles.RegUser)
  if (seekAdminAuth) {
    connectedUser = await userService.findOneByAdminAuthUserId(validatedAuthUser.uid)
  }
  if (!connectedUser && seekRegularAuth) {
    connectedUser = await userService.findOneByAuthUserId(validatedAuthUser.uid)
    if (connectedUser) {
      connectedUser.admin = null
    }
  }

  if (!connectedUser) {
    // Forbidden
    res
      .status(403)
      .json(
        of(
          null,
          ResponseStatusCodes.AccessDenied,
          `Cannot find ${seekRegularAuth ? 'user' : 'admin user'} with authUserId [${
            validatedAuthUser.uid
          }]`,
        ),
      )
    return
  }

  // TODO: Check if user is "active"

  // Set it for the actual route
  res.locals.connectedUser = connectedUser // TODO to be replaced with `authenticatedUser`
  res.locals.authenticatedUser = connectedUser

  // Done
  next()
}
