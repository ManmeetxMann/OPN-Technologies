import {NextFunction, Request, Response} from 'express'

export const authorizationMiddleware = () => async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const data = {
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

  switch (req.headers.authorization) {
    case 'Bearer CorporateUserForTEST1': {
      data.admin.isLabUser = false
      break
    }
  }

  res.locals.authenticatedUser = data
  // Done
  next()
}
