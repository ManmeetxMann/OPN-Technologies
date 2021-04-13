import {Inject, CanActivate, ExecutionContext} from '@nestjs/common'

import {FirebaseAuthService} from '@opn/common/services/auth/firebase-auth.service'

/**
 * TODO:
 * 1. Throw exceptions with specific reason
 * 2. Handle user DB read
 */

export class AuthGuard implements CanActivate {
  constructor(
    @Inject('FirebaseAuthService') private readonly firebaseAuthService: FirebaseAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // const roles = this.reflector.get<string>('roles', context.getHandler())
    // if (!roles) {
    //   return true
    // }
    const req = context.switchToHttp().getRequest()
    const bearerHeader = req.headers['authorization']

    if (!bearerHeader) {
      // res
      //   .status(401)
      //   .json(of(null, ResponseStatusCodes.Unauthorized, 'Authorization token required'))
      return false
    }

    // Get the Bearer token and first sanity check
    const bearer = bearerHeader.split(' ')
    if (!bearer || bearer.length < 2 || bearer[0] == '' || bearer[0].toLowerCase() !== 'bearer') {
      // Forbidden
      // res
      //   .status(401)
      //   .json(
      //     of(
      //       null,
      //       ResponseStatusCodes.Unauthorized,
      //       'Unexpected format for Authorization header',
      //     ),
      //   )
      return false
    }

    const idToken = bearer[1]
    // Validate
    // const authService = new AuthService()
    const validatedAuthUser = await this.firebaseAuthService.verifyAuthToken(idToken)
    if (!validatedAuthUser) {
      // res.status(401).json(of(null, ResponseStatusCodes.Unauthorized, 'Invalid access-token'))
      return false
    }

    return true
    // const userService = new UserService()
    // let connectedUser: User
    // // look up admin user for backwards compat
    // const [regUser, legacyAdminUser] = await Promise.all([
    //   userService.findOneByAuthUserId(validatedAuthUser.uid),
    //   userService.findOneByAdminAuthUserId(validatedAuthUser.uid),
    // ])
    // let user: User | null = null
    // if (regUser) {
    //   user = regUser
    //   if (legacyAdminUser && legacyAdminUser.id !== user.id) {
    //     console.warn(
    //       `Two users found for authUserId ${validatedAuthUser.uid}, using ${regUser.id}`,
    //     )
    //   }
    // } else if (legacyAdminUser) {
    //   console.warn(`Using legacy admin.authUserId for authUserId ${validatedAuthUser.uid}`)
    //   user = legacyAdminUser
    // }

    // if (!user) {
    //   res
    //     .status(403)
    //     .json(
    //       of(
    //         null,
    //         ResponseStatusCodes.AccessDenied,
    //         `Cannot find user with authUserId [${validatedAuthUser.uid}]`,
    //       ),
    //     )
    //   return
    // }

    // const seekRegularAuth = listOfRequiredRoles.includes(RequiredUserPermission.RegUser)
    // const seekAdminAuth = listOfRequiredRoles.some(
    //   role => role !== RequiredUserPermission.RegUser,
    // )

    // let gotAdminAuth = false
    // if (seekAdminAuth) {
    //   // try to authenticate the user as an admin
    //   // TODO: org check
    //   if (user.admin) {
    //     connectedUser = user
    //     gotAdminAuth = true
    //   }
    // }

    // if (!connectedUser && seekRegularAuth) {
    //   connectedUser = user
    // }

    // if (!connectedUser) {
    //   // Forbidden
    //   res
    //     .status(403)
    //     .json(
    //       of(
    //         null,
    //         ResponseStatusCodes.AccessDenied,
    //         `Cannot find ${seekRegularAuth ? 'user' : 'admin user'} with authUserId [${
    //           validatedAuthUser.uid
    //         }]`,
    //       ),
    //     )
    //   return
    // }

    // const organizationId =
    //   (req.query.organizationId as string) ??
    //   (req.params?.organizationId as string) ??
    //   (req.body?.organizationId as string) ??
    //   // headers are coerced to lowercase
    //   (req.headers?.organizationid as string) ??
    //   null

    // const labId =
    //   (req.query.labId as string) ??
    //   (req.params?.labId as string) ??
    //   (req.body?.labId as string) ??
    //   // headers are coerced to lowercase
    //   (req.headers?.labid as string) ??
    //   null

    // const admin = connectedUser.admin as AdminProfile

    // if (requireOrg) {
    //   if (!organizationId) {
    //     if (!authorizedWithoutOrgId(admin, organizationId)) {
    //       console.warn(`${connectedUser.id} did not provide an organizationId`)
    //       // Forbidden
    //       res
    //         .status(403)
    //         .json(of(null, ResponseStatusCodes.AccessDenied, `Organization ID not provided`))
    //       return
    //     }
    //   } else if (gotAdminAuth) {
    //     // user authenticated as an admin, needs to be valid
    //     if (!isAllowed(connectedUser, listOfRequiredRoles, labId)) {
    //       console.warn(`${organizationId} is not accesible to ${connectedUser.id}`)
    //       // Forbidden
    //       res
    //         .status(403)
    //         .json(
    //           of(
    //             null,
    //             ResponseStatusCodes.AccessDenied,
    //             `Organization ID ${organizationId} is not accesible`,
    //           ),
    //         )
    //       return
    //     }
    //   } else {
    //     if (!seekRegularAuth) {
    //       // not an admin but admin required
    //       console.warn(`${organizationId} is not admin-accesible to ${connectedUser.id}`)
    //       // Forbidden
    //       res
    //         .status(403)
    //         .json(
    //           of(
    //             null,
    //             ResponseStatusCodes.AccessDenied,
    //             `Organization ID ${organizationId} is not accesible`,
    //           ),
    //         )
    //       return
    //     }

    //     // just need to be a member of the organization
    //     if (!(connectedUser.organizationIds ?? []).includes(organizationId)) {
    //       console.warn(`${organizationId} is not connected to ${connectedUser.id}`)
    //       // Forbidden
    //       res
    //         .status(403)
    //         .json(
    //           of(
    //             null,
    //             ResponseStatusCodes.AccessDenied,
    //             `Organization ID ${organizationId} is not accesible`,
    //           ),
    //         )
    //       return
    //     }
    //   }
    // }

    // // this check is only required for admins
    // if (gotAdminAuth && !isAllowed(connectedUser, listOfRequiredRoles, labId)) {
    //   console.warn(`Admin user ${connectedUser.id} is not allowed for ${listOfRequiredRoles}`)
    //   // Forbidden
    //   res
    //     .status(403)
    //     .json(of(null, ResponseStatusCodes.AccessDenied, `Required Permissions are missing`))
    //   return
    // }

    // // Set it for the actual route
    // res.locals.connectedUser = connectedUser // TODO to be replaced with `authenticatedUser`
    // res.locals.authenticatedUser = connectedUser
    // // TODO: controllers should use this instead of reading the query/body/header so we can refactor separately
    // res.locals.organizationId = organizationId

    // Done
    // next()
    // do something with context and role
    // return true
  }
}

// const authorizedWithoutOrgId = (admin: AdminProfile, organizationId: string): boolean => {
//   //IF OPN Super Admin or LAB User then Allow Access Without ORG ID
//   const isOpnSuperAdmin = admin?.isOpnSuperAdmin ?? false
//   const isClinicUser = admin?.isClinicUser ?? false
//   const isLabUser = admin?.isLabUser ?? false

//   const authorizedOrganizationIds = [
//     ...(admin?.superAdminForOrganizationIds ?? []),
//     admin?.adminForOrganizationId,
//   ].filter(id => !!id)
//   const hasGrantedAccess = new Set(authorizedOrganizationIds).has(organizationId)
//   if (!isLabUser && !isOpnSuperAdmin && !isClinicUser && !hasGrantedAccess) {
//     return false
//   }
//   return true
// }

// const isAllowed = (
//   connectedUser: User,
//   listOfRequiredPermissions: RequiredUserPermission[],
//   labId: string,
// ): boolean => {
//   const admin = connectedUser.admin as AdminProfile | null
//   const userId = connectedUser.id
//   if (admin?.isOpnSuperAdmin) {
//     //Super Admin has all permissions
//     console.warn(`SuperAdmin Permissions used for userID: ${connectedUser.id}`)
//     return true
//   }

//   const seekLabOrOrgAppointment = listOfRequiredPermissions.includes(
//     RequiredUserPermission.LabOrOrgAppointments,
//   )
//   const seekLabReceiving = listOfRequiredPermissions.includes(RequiredUserPermission.LabReceiving)
//   const seekAllowCheckIn = listOfRequiredPermissions.includes(RequiredUserPermission.AllowCheckIn)
//   const seekGenerateBarCodeAdmin = listOfRequiredPermissions.includes(
//     RequiredUserPermission.GenerateBarCodeAdmin,
//   )
//   const seekLookupAdmin = listOfRequiredPermissions.includes(RequiredUserPermission.LookupAdmin)
//   const seekLabAppointments = listOfRequiredPermissions.includes(
//     RequiredUserPermission.LabAppointments,
//   )
//   const seekOPNAdmin = listOfRequiredPermissions.includes(RequiredUserPermission.OPNAdmin)
//   const seekLabTransportRunsCreate = listOfRequiredPermissions.includes(
//     RequiredUserPermission.LabTransportRunsCreate,
//   )
//   const seekLabTransportRunsList = listOfRequiredPermissions.includes(
//     RequiredUserPermission.LabTransportRunsList,
//   )
//   const seekLabPCRTestResults = listOfRequiredPermissions.includes(
//     RequiredUserPermission.LabPCRTestResults,
//   )
//   const seekLabSendBulkResults = listOfRequiredPermissions.includes(
//     RequiredUserPermission.LabSendBulkResults,
//   )
//   const seekLabSendSingleResults = listOfRequiredPermissions.includes(
//     RequiredUserPermission.LabSendSingleResults,
//   )
//   const seekLabDueToday = listOfRequiredPermissions.includes(RequiredUserPermission.LabDueToday)
//   const seekLabTestRunsCreate = listOfRequiredPermissions.includes(
//     RequiredUserPermission.LabTestRunsCreate,
//   )
//   const seekLabTestRunsList = listOfRequiredPermissions.includes(
//     RequiredUserPermission.LabTestRunsList,
//   )
//   const seekLabConfirmResults = listOfRequiredPermissions.includes(
//     RequiredUserPermission.LabConfirmResults,
//   )
//   const seekClinicRapidResultSenderAdmin = listOfRequiredPermissions.includes(
//     RequiredUserPermission.ClinicRapidResultSenderAdmin,
//   )
//   const seekTestKitBatchAdmin = listOfRequiredPermissions.includes(
//     RequiredUserPermission.TestKitBatchAdmin,
//   )

//   const labUserWithLabId = admin.isLabUser && !labId ? false : true

//   if (
//     seekLabOrOrgAppointment &&
//     ((!admin?.isLabAppointmentsAdmin && !admin?.isTestAppointmentsAdmin) || !labUserWithLabId)
//   ) {
//     console.warn(`Admin user ${userId} needs isLabAppointmentsAdmin or isTestAppointmentsAdmin`)
//     return false
//   }
//   if (seekLabAppointments && (!admin?.isLabAppointmentsAdmin || !labUserWithLabId)) {
//     console.warn(`Admin user ${userId} needs isLabAppointmentsAdmin`)
//     return false
//   }
//   if (seekLabTransportRunsCreate && (!admin?.isTransportsRunsAdmin || !labUserWithLabId)) {
//     console.warn(`Admin user ${userId} needs isTransportsRunsAdmin`)
//     return false
//   }
//   if (
//     seekLabTransportRunsList &&
//     ((!admin?.isTransportsRunsAdmin && !admin?.isLabAppointmentsAdmin) || !labUserWithLabId)
//   ) {
//     console.warn(`Admin user ${userId} needs isTransportsRunsAdmin Or isLabAppointmentsAdmin`)
//     return false
//   }
//   if (seekLabReceiving && (!admin?.isReceivingAdmin || !labUserWithLabId)) {
//     console.warn(`Admin user ${userId} needs isReceivingAdmin`)
//     return false
//   }
//   if (seekAllowCheckIn && !admin?.isCheckInAdmin) {
//     console.warn(`Admin user ${userId} needs isIDBarCodesAdmin`)
//     return false
//   }
//   if (seekGenerateBarCodeAdmin && !admin?.isGenerateAdmin) {
//     console.warn(`Admin user ${userId} needs isIDBarCodesAdmin`)
//     return false
//   }
//   if (seekLookupAdmin && !admin?.isLookupAdmin) {
//     console.warn(`Admin user ${userId} needs isIDBarCodesAdmin`)
//     return false
//   }

//   if (
//     seekLabPCRTestResults &&
//     ((!admin?.isLabResultsAdmin && !admin?.isTestReportsAdmin && !admin?.isRapidResultOrgAdmin) ||
//       !labUserWithLabId)
//   ) {
//     console.warn(
//       `Admin user ${userId} needs isLabResultsAdmin Or isTestReportsAdmin Or isRapidResultOrgAdmin`,
//     )
//     return false
//   }
//   if (seekLabSendBulkResults && (!admin?.isBulkUploadAdmin || !labUserWithLabId)) {
//     console.warn(`Admin user ${userId} needs isBulkUploadAdmin`)
//     return false
//   }
//   if (seekLabSendSingleResults && (!admin?.isSingleResultSendAdmin || !labUserWithLabId)) {
//     console.warn(`Admin user ${userId} needs isSingleResultSendAdmin`)
//     return false
//   }
//   if (seekLabDueToday && (!admin?.isDueTodayAdmin || !labUserWithLabId)) {
//     console.warn(`Admin user ${userId} needs isDueTodayAdmin`)
//     return false
//   }
//   if (
//     seekLabTestRunsList &&
//     ((!admin?.isTestRunsAdmin && !admin?.isDueTodayAdmin) || !labUserWithLabId)
//   ) {
//     console.warn(`Admin user ${userId} needs isTestRunsAdmin Or isDueTodayAdmin`)
//     return false
//   }
//   if (seekLabTestRunsCreate && (!admin?.isTestRunsAdmin || !labUserWithLabId)) {
//     console.warn(`Admin user ${userId} needs isTestRunsAdmin`)
//     return false
//   }
//   if (seekLabConfirmResults && (!admin?.isConfirmResultAdmin || !labUserWithLabId)) {
//     console.warn(`Admin user ${userId} needs isConfirmResultAdmin`)
//     return false
//   }
//   if (seekClinicRapidResultSenderAdmin && !admin?.isRapidResultSenderAdmin) {
//     console.warn(`Admin user ${userId} needs isRapidResultSenderAdmin`)
//     return false
//   }
//   if (seekOPNAdmin && !admin?.isOpnSuperAdmin) {
//     console.warn(`Admin user ${userId} needs isOpnSuperAdmin`)
//     return false
//   }
//   if (seekTestKitBatchAdmin && !admin?.isTestKitBatchAdmin) {
//     console.warn(`Admin user ${userId} needs isTestKitBatchAdmin`)
//     return false
//   }
//   return true
// }
