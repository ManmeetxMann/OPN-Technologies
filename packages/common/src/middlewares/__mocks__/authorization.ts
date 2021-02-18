import {NextFunction, Request, Response} from 'express'

export const authorizationMiddleware = () => async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  res.locals.authenticatedUser = {
    id: 'USER1',
    firstName: 'UNITEST_FNAME',
    lastName: 'UNITEST_LNAME',
    base64Photo: null,
    organizationIds: ['TEST1'],
    email: 'unitest1@stayopn.com',
    admin: {
      isLabUser: true,
    },
    authUserId: 'TEST',
    delegates: [],
  }
  // Done
  next()
}
