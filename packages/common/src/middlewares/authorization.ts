import {NextFunction, Request, Response} from 'express'

import {AuthService} from '../service/auth/auth-service'
import {UserService} from '../service/user/user-service'
import {of} from '../utils/response-wrapper'
import {ResponseStatusCodes} from '../types/response-status'
import {UserRoles} from '../types/authorization'
import {User} from '../data/user'
import { AdminProfile } from '../data/admin'

export const authorizationMiddleware = (requiredRole?: UserRoles[]) => async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const listOfRequiredRoles = requiredRole ?? [UserRoles.RegUser]

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
  const seekRegularAuth = listOfRequiredRoles.includes(UserRoles.RegUser)
  if (!seekRegularAuth) {
    connectedUser = await userService.findOneByAdminAuthUserId(validatedAuthUser.uid)
  }

  if (!connectedUser) {
    const regularUser = await userService.findOneByAuthUserId(validatedAuthUser.uid)
    if (regularUser) {
      if (!seekRegularAuth && regularUser.admin) {
        connectedUser = regularUser
        console.warn(
          `Admin user ${connectedUser.id} was allowed to authenticate using user.authUserId`,
        )
      } else if (seekRegularAuth) {
        connectedUser = regularUser
        connectedUser.admin = null
      }
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

  const organizationId = req.query['organizationId'] as string | null
  const admin = connectedUser.admin as AdminProfile
  if(!authorizedWithoutOrgId(admin, organizationId)){
    // Forbidden
    res
      .status(403)
      .json(
        of(
          null,
          ResponseStatusCodes.AccessDenied,
          `Organization ID ${organizationId} is not accesible`,
        ),
      )
    return
  }

  if(!isAllowed(admin, listOfRequiredRoles)){
    console.warn(
      `Admin user ${connectedUser.id} is not allowed for ${listOfRequiredRoles}`,
    )
    // Forbidden
    res
      .status(403)
      .json(
        of(
          null,
          ResponseStatusCodes.AccessDenied,
          `Required Permissions are missing`,
        ),
      )
    return
  }

  // Set it for the actual route
  res.locals.connectedUser = connectedUser // TODO to be replaced with `authenticatedUser`
  res.locals.authenticatedUser = connectedUser

  // Done
  next()
}

const authorizedWithoutOrgId = (admin:AdminProfile, organizationId:string): boolean=>{  
  //IF OPN Super Admin or LAB User then Allow Access Without ORG ID
  const isOpnSuperAdmin = admin?.isOpnSuperAdmin ?? false
  const isLabAdmin = admin?.isLabAdmin ?? false
  const authorizedOrganizationIds = [
    ...(admin?.superAdminForOrganizationIds ?? []),
    admin?.adminForOrganizationId,
  ].filter((id) => !!id)
  const hasGrantedAccess = new Set(authorizedOrganizationIds).has(organizationId)
  if (!isLabAdmin && !isOpnSuperAdmin && !hasGrantedAccess) {
    return false
  }
  return true
}

const isAllowed = (admin:AdminProfile, listOfRequiredRoles:UserRoles[]): boolean=>{ 
  const seekAppointmentAdmin = listOfRequiredRoles.includes(UserRoles.AppointmentsAdmin)
  if(seekAppointmentAdmin && !admin.isTestAppointmentsAdmin && !admin.isLabAppointmentsAdmin){
    return false
  }
  return true
}