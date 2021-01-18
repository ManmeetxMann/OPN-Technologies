import {NextFunction, Request, Response} from 'express'

import {AuthService} from '../service/auth/auth-service'
import {UserService} from '../service/user/user-service'
import {of} from '../utils/response-wrapper'
import {ResponseStatusCodes} from '../types/response-status'
import {RequiredUserPermission} from '../types/authorization'
import {User} from '../data/user'
import {AdminProfile} from '../data/admin'

export const authorizationMiddleware = (
  listOfRequiredRoles: RequiredUserPermission[],
  byPassOrgCheck?: boolean,
) => async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const byPassOrganizationCheck = byPassOrgCheck ?? false
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
  const seekRegularAuth = listOfRequiredRoles.includes(RequiredUserPermission.RegUser)
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

  const organizationId =
    (req.query.organizationId as string) ??
    (req.params?.organizationId as string) ??
    (req.body?.organizationId as string) ??
    null

  if (!byPassOrganizationCheck && !organizationId) {
    console.warn(`${connectedUser.id} did not provide an organizationId`)
    // Forbidden
    res.status(403).json(of(null, ResponseStatusCodes.AccessDenied, `Organization ID not provided`))
    return
  }

  const admin = connectedUser.admin as AdminProfile
  if (!byPassOrganizationCheck) {
    if (admin) {
      // user authenticated as an admin, needs to be valid
      if (!authorizedWithoutOrgId(admin, organizationId)) {
        console.warn(`${organizationId} is not accesible to ${connectedUser.id}`)
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
    } else {
      if (!seekRegularAuth) {
        // not an admin but admin required
        console.warn(`${organizationId} is not admin-accesible to ${connectedUser.id}`)
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

      // just need to be a member of the organization
      if (!(connectedUser.organizationIds ?? []).includes(organizationId)) {
        console.warn(`${organizationId} is not connected to ${connectedUser.id}`)
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
    }
  }

  // this check is only required for admins
  if (admin && !isAllowed(admin, listOfRequiredRoles, connectedUser.id)) {
    console.warn(`Admin user ${connectedUser.id} is not allowed for ${listOfRequiredRoles}`)
    // Forbidden
    res
      .status(403)
      .json(of(null, ResponseStatusCodes.AccessDenied, `Required Permissions are missing`))
    return
  }

  // Set it for the actual route
  res.locals.connectedUser = connectedUser // TODO to be replaced with `authenticatedUser`
  res.locals.authenticatedUser = connectedUser
  // TODO: controllers should use this instead of reading the query/body/header so we can refactor separately
  res.locals.organizationId = organizationId

  // Done
  next()
}

const authorizedWithoutOrgId = (admin: AdminProfile, organizationId: string): boolean => {
  //IF OPN Super Admin or LAB User then Allow Access Without ORG ID
  const isOpnSuperAdmin = admin?.isOpnSuperAdmin ?? false
  const isLabUser = admin?.isLabUser ?? false
  const authorizedOrganizationIds = [
    ...(admin?.superAdminForOrganizationIds ?? []),
    admin?.adminForOrganizationId,
  ].filter((id) => !!id)
  const hasGrantedAccess = new Set(authorizedOrganizationIds).has(organizationId)
  if (!isLabUser && !isOpnSuperAdmin && !hasGrantedAccess) {
    return false
  }
  return true
}

const isAllowed = (
  admin: AdminProfile,
  listOfRequiredPermissions: RequiredUserPermission[],
  userId: string,
): boolean => {
  const seekLabAppointmentAdmin = listOfRequiredPermissions.includes(
    RequiredUserPermission.LabAppointments,
  )
  const seekOPNAdmin = listOfRequiredPermissions.includes(RequiredUserPermission.OPNAdmin)
  if (seekLabAppointmentAdmin && !admin.isLabAppointmentsAdmin && !admin.isTestAppointmentsAdmin) {
    console.warn(`Admin user ${userId} needs isLabAppointmentsAdmin or isTestAppointmentsAdmin`)
    return false
  }
  if (seekOPNAdmin && !admin.isOpnSuperAdmin) {
    console.warn(`Admin user ${userId} needs isOpnSuperAdmin`)
    return false
  }
  return true
}
