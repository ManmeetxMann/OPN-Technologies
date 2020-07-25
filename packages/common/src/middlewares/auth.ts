import {NextFunction, Request, Response} from 'express'

import {AuthService} from '../service/auth/auth-service'
import {UserService} from '../service/user/user-service'

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const bearerHeader = req.headers['authorization']
  if (!bearerHeader) {
    // Forbidden
    res.sendStatus(403)
    return
  }

  // Get the Bearer token and first sanity check
  const bearer = bearerHeader.split(' ')
  if (!bearer || bearer.length < 2 || bearer[0] == '' || bearer[0].toLowerCase() !== 'bearer') {
    // Forbidden
    res.sendStatus(403)
    return
  }

  const idToken = bearer[1]

  // Validate
  const authService = new AuthService()
  const validatedAuthUser = await authService.verifyAuthToken(idToken)
  if (!validatedAuthUser) {
    // Forbidden
    res.sendStatus(403)
    return
  }

  // Grab our claim
  // TODO: using claims to get the id and then calling a get(...) instead of query
  //       would have been faster... but the claim won't propogate because they already
  //       had their claim... To be researched :-)
  const userService = new UserService()
  const connectedUser = await userService.findOneByAuthUserId(validatedAuthUser.uid)
  if (!connectedUser) {
    // Forbidden
    res.sendStatus(403)
    return
  }

  // Set it for the actual route
  res.locals.connectedUser = connectedUser

  // Done
  next()
}
