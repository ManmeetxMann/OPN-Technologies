import {NextFunction, Request, Response} from 'express'
import basicAuth from 'express-basic-auth'

export const middlewareGenerator = (password: string) => (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!password) {
    next()
    return
  }
  const middleware = basicAuth({users: {admin: password}, challenge: true})
  middleware(req, res, next)
}
