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
      isTestKitBatchAdmin: false,
      isOpnSuperAdmin: false,
      isClinicUser: false,
    },
    authUserId: 'TEST',
    delegates: [],
  }

  switch (req.headers.authorization) {
    case 'Bearer CorporateUserForTEST1': {
      data.admin.isLabUser = false
      break
    }
    case 'Bearer SuperAdmin': {
      data.admin.isOpnSuperAdmin = true
      break
    }
    case 'Bearer ClinicUser': {
      data.admin.isLabUser = false
      data.admin.isClinicUser = true
      break
    }
    case 'Bearer LabUser': {
      data.admin.isLabUser = true
      break
    }
  }

  res.locals.authenticatedUser = data
  // Done
  next()
}
