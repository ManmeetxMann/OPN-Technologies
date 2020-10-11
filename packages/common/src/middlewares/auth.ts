import {NextFunction, Request, Response} from 'express'

import {AuthService} from '../service/auth/auth-service'
import {UserService} from '../service/user/user-service'
import {of} from '../utils/response-wrapper'
import {ResponseStatusCodes} from '../types/response-status'

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
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

  // Grab our claim
  // TODO: using claims to get the id and then calling a get(...) instead of query
  //       would have been faster... but the claim won't propagate because they already
  //       had their claim... To be researched :-)
  const userService = new UserService()
  const connectedUser = await userService.findOneByAuthUserId(validatedAuthUser.uid)

  if (!connectedUser) {
    // Forbidden
    res
      .status(403)
      .json(
        of(
          null,
          ResponseStatusCodes.AccessDenied,
          `Cannot find user with auth-uid [${validatedAuthUser.uid}]`,
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
