import {Injectable, NestMiddleware} from '@nestjs/common'

import {FirebaseAuthService} from '@opn-services/common/services/auth/firebase-auth.service'

import {RequiredUserPermission} from '@opn-common-v1/types/authorization'
import {User} from '@opn-common-v1/data/user'
import {UserService} from '@opn-common-v1/service/user/user-service'
import {AdminProfile} from '@opn-common-v1/data/admin'

import {ForbiddenException, UnauthorizedException} from '../exception'
/**
 * TODO:
 * 1. Check handle require org
 * 2. Check is swagger is enabled and basic auth
 */

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private firebaseAuthService: FirebaseAuthService, private userService: UserService) {}

  private authorizedWithoutOrgId = (admin: AdminProfile, organizationId: string): boolean => {
    //IF OPN Super Admin or LAB User then Allow Access Without ORG ID
    const isOpnSuperAdmin = admin?.isOpnSuperAdmin ?? false
    const isClinicUser = admin?.isClinicUser ?? false
    const isLabUser = admin?.isLabUser ?? false

    const authorizedOrganizationIds = [
      ...(admin?.superAdminForOrganizationIds ?? []),
      admin?.adminForOrganizationId,
    ].filter(id => !!id)
    const hasGrantedAccess = new Set(authorizedOrganizationIds).has(organizationId)
    if (!isLabUser && !isOpnSuperAdmin && !isClinicUser && !hasGrantedAccess) {
      return false
    }
    return true
  }

  private isAllowed = (
    connectedUser: User,
    listOfRequiredPermissions: RequiredUserPermission[],
    labId: string,
  ): boolean => {
    const admin = connectedUser.admin as AdminProfile | null
    const userId = connectedUser.id
    if (admin?.isOpnSuperAdmin) {
      //Super Admin has all permissions
      console.warn(`SuperAdmin Permissions used for userID: ${connectedUser.id}`)
      return true
    }

    const seekLabOrOrgAppointment = listOfRequiredPermissions.includes(
      RequiredUserPermission.LabOrOrgAppointments,
    )
    const seekLabReceiving = listOfRequiredPermissions.includes(RequiredUserPermission.LabReceiving)
    const seekAllowCheckIn = listOfRequiredPermissions.includes(RequiredUserPermission.AllowCheckIn)
    const seekGenerateBarCodeAdmin = listOfRequiredPermissions.includes(
      RequiredUserPermission.GenerateBarCodeAdmin,
    )
    const seekLookupAdmin = listOfRequiredPermissions.includes(RequiredUserPermission.LookupAdmin)
    const seekLabAppointments = listOfRequiredPermissions.includes(
      RequiredUserPermission.LabAppointments,
    )
    const seekOPNAdmin = listOfRequiredPermissions.includes(RequiredUserPermission.OPNAdmin)
    const seekLabTransportRunsCreate = listOfRequiredPermissions.includes(
      RequiredUserPermission.LabTransportRunsCreate,
    )
    const seekLabTransportRunsList = listOfRequiredPermissions.includes(
      RequiredUserPermission.LabTransportRunsList,
    )
    const seekLabPCRTestResults = listOfRequiredPermissions.includes(
      RequiredUserPermission.LabPCRTestResults,
    )
    const seekLabSendBulkResults = listOfRequiredPermissions.includes(
      RequiredUserPermission.LabSendBulkResults,
    )
    const seekLabSendSingleResults = listOfRequiredPermissions.includes(
      RequiredUserPermission.LabSendSingleResults,
    )
    const seekLabDueToday = listOfRequiredPermissions.includes(RequiredUserPermission.LabDueToday)
    const seekLabTestRunsCreate = listOfRequiredPermissions.includes(
      RequiredUserPermission.LabTestRunsCreate,
    )
    const seekLabTestRunsList = listOfRequiredPermissions.includes(
      RequiredUserPermission.LabTestRunsList,
    )
    const seekLabConfirmResults = listOfRequiredPermissions.includes(
      RequiredUserPermission.LabConfirmResults,
    )
    const seekClinicRapidResultSenderAdmin = listOfRequiredPermissions.includes(
      RequiredUserPermission.ClinicRapidResultSenderAdmin,
    )
    const seekTestKitBatchAdmin = listOfRequiredPermissions.includes(
      RequiredUserPermission.TestKitBatchAdmin,
    )

    const labUserWithLabId = admin.isLabUser && !labId ? false : true

    if (
      seekLabOrOrgAppointment &&
      ((!admin?.isLabAppointmentsAdmin && !admin?.isTestAppointmentsAdmin) || !labUserWithLabId)
    ) {
      console.warn(`Admin user ${userId} needs isLabAppointmentsAdmin or isTestAppointmentsAdmin`)
      return false
    }
    if (seekLabAppointments && (!admin?.isLabAppointmentsAdmin || !labUserWithLabId)) {
      console.warn(`Admin user ${userId} needs isLabAppointmentsAdmin`)
      return false
    }
    if (seekLabTransportRunsCreate && (!admin?.isTransportsRunsAdmin || !labUserWithLabId)) {
      console.warn(`Admin user ${userId} needs isTransportsRunsAdmin`)
      return false
    }
    if (
      seekLabTransportRunsList &&
      ((!admin?.isTransportsRunsAdmin && !admin?.isLabAppointmentsAdmin) || !labUserWithLabId)
    ) {
      console.warn(`Admin user ${userId} needs isTransportsRunsAdmin Or isLabAppointmentsAdmin`)
      return false
    }
    if (seekLabReceiving && (!admin?.isReceivingAdmin || !labUserWithLabId)) {
      console.warn(`Admin user ${userId} needs isReceivingAdmin`)
      return false
    }
    if (seekAllowCheckIn && !admin?.isCheckInAdmin) {
      console.warn(`Admin user ${userId} needs isIDBarCodesAdmin`)
      return false
    }
    if (seekGenerateBarCodeAdmin && !admin?.isGenerateAdmin) {
      console.warn(`Admin user ${userId} needs isIDBarCodesAdmin`)
      return false
    }
    if (seekLookupAdmin && !admin?.isLookupAdmin) {
      console.warn(`Admin user ${userId} needs isIDBarCodesAdmin`)
      return false
    }

    if (
      seekLabPCRTestResults &&
      ((!admin?.isLabResultsAdmin && !admin?.isTestReportsAdmin && !admin?.isRapidResultOrgAdmin) ||
        !labUserWithLabId)
    ) {
      console.warn(
        `Admin user ${userId} needs isLabResultsAdmin Or isTestReportsAdmin Or isRapidResultOrgAdmin`,
      )
      return false
    }
    if (seekLabSendBulkResults && (!admin?.isBulkUploadAdmin || !labUserWithLabId)) {
      console.warn(`Admin user ${userId} needs isBulkUploadAdmin`)
      return false
    }
    if (seekLabSendSingleResults && (!admin?.isSingleResultSendAdmin || !labUserWithLabId)) {
      console.warn(`Admin user ${userId} needs isSingleResultSendAdmin`)
      return false
    }
    if (seekLabDueToday && (!admin?.isDueTodayAdmin || !labUserWithLabId)) {
      console.warn(`Admin user ${userId} needs isDueTodayAdmin`)
      return false
    }
    if (
      seekLabTestRunsList &&
      ((!admin?.isTestRunsAdmin && !admin?.isDueTodayAdmin) || !labUserWithLabId)
    ) {
      console.warn(`Admin user ${userId} needs isTestRunsAdmin Or isDueTodayAdmin`)
      return false
    }
    if (seekLabTestRunsCreate && (!admin?.isTestRunsAdmin || !labUserWithLabId)) {
      console.warn(`Admin user ${userId} needs isTestRunsAdmin`)
      return false
    }
    if (seekLabConfirmResults && (!admin?.isConfirmResultAdmin || !labUserWithLabId)) {
      console.warn(`Admin user ${userId} needs isConfirmResultAdmin`)
      return false
    }
    if (seekClinicRapidResultSenderAdmin && !admin?.isRapidResultSenderAdmin) {
      console.warn(`Admin user ${userId} needs isRapidResultSenderAdmin`)
      return false
    }
    if (seekOPNAdmin && !admin?.isOpnSuperAdmin) {
      console.warn(`Admin user ${userId} needs isOpnSuperAdmin`)
      return false
    }
    if (seekTestKitBatchAdmin && !admin?.isTestKitBatchAdmin) {
      console.warn(`Admin user ${userId} needs isTestKitBatchAdmin`)
      return false
    }
    return true
  }

  async use(req, res, next) {
    // TODO: move this logic to the decorator
    const listOfRequiredRoles = [RequiredUserPermission.RegUser]
    const requireOrg = true

    // Allow Swagger
    if ((req.originalUrl as string).startsWith('/api/doc/')) {
      return next()
    }

    const bearerHeader = req.headers['authorization']
    if (!bearerHeader) {
      throw new UnauthorizedException('Authorization token required')
    }

    // Get the Bearer token and first sanity check
    const bearer = bearerHeader.split(' ')
    if (!bearer || bearer.length < 2 || bearer[0] == '' || bearer[0].toLowerCase() !== 'bearer') {
      throw new UnauthorizedException('Unexpected format for Authorization header')
    }

    const idToken = bearer[1]
    // Validate
    // const authService = new AuthService()
    const validatedAuthUser = await this.firebaseAuthService.verifyAuthToken(idToken)
    if (!validatedAuthUser) {
      // res.status(401).json(of(null, ResponseStatusCodes.Unauthorized, 'Invalid access-token'))
      return false
    }
    // return true
    let connectedUser: User
    // look up admin user for backwards compat
    const [regUser, legacyAdminUser] = await Promise.all([
      this.userService.findOneByAuthUserId(validatedAuthUser.uid),
      this.userService.findOneByAdminAuthUserId(validatedAuthUser.uid),
    ])
    let user: User | null = null
    if (regUser) {
      user = regUser
      if (legacyAdminUser && legacyAdminUser.id !== user.id) {
        console.warn(`Two users found for authUserId ${validatedAuthUser.uid}, using ${regUser.id}`)
      }
    } else if (legacyAdminUser) {
      console.warn(`Using legacy admin.authUserId for authUserId ${validatedAuthUser.uid}`)
      user = legacyAdminUser
    }

    if (!user) {
      throw new ForbiddenException(`Cannot find user with authUserId [${validatedAuthUser.uid}]`)
    }

    const seekRegularAuth = listOfRequiredRoles.includes(RequiredUserPermission.RegUser)
    const seekAdminAuth = listOfRequiredRoles.some(role => role !== RequiredUserPermission.RegUser)

    let gotAdminAuth = false
    if (seekAdminAuth) {
      // try to authenticate the user as an admin
      // TODO: org check
      if (user.admin) {
        connectedUser = user
        gotAdminAuth = true
      }
    }

    if (!connectedUser && seekRegularAuth) {
      connectedUser = user
    }

    if (!connectedUser) {
      throw new ForbiddenException(
        `Cannot find ${seekRegularAuth ? 'user' : 'admin user'} with authUserId [${
          validatedAuthUser.uid
        }]`,
      )
    }

    const organizationId =
      (req.query?.organizationId as string) ??
      (req.params?.organizationId as string) ??
      (req.body?.organizationId as string) ??
      // headers are coerced to lowercase
      (req.headers?.organizationid as string) ??
      null

    const labId =
      (req.query?.labId as string) ??
      (req.params?.labId as string) ??
      (req.body?.labId as string) ??
      // headers are coerced to lowercase
      (req.headers?.labid as string) ??
      null

    const admin = connectedUser.admin as AdminProfile

    if (requireOrg) {
      if (!organizationId) {
        if (this.authorizedWithoutOrgId(admin, organizationId)) {
          console.warn(`${connectedUser.id} did not provide an organizationId`)

          throw new ForbiddenException(`Organization ID not provided`)
        }
      } else if (gotAdminAuth) {
        // user authenticated as an admin, needs to be valid
        if (this.isAllowed(connectedUser, listOfRequiredRoles, labId)) {
          console.warn(`${organizationId} is not accesible to ${connectedUser.id}`)
          // Forbidden
          throw new ForbiddenException(`Organization ID ${organizationId} is not accesible`)
        }
      }
    } else {
      if (!seekRegularAuth) {
        // not an admin but admin required
        console.warn(`${organizationId} is not admin-accesible to ${connectedUser.id}`)

        throw new ForbiddenException(`Organization ID ${organizationId} is not accesible`)
      }

      // just need to be a member of the organization
      if (!(connectedUser.organizationIds ?? []).includes(organizationId)) {
        console.warn(`${organizationId} is not connected to ${connectedUser.id}`)

        throw new ForbiddenException(`Organization ID ${organizationId} is not accesible`)
      }
    }

    // this check is only required for admins
    if (gotAdminAuth && !this.isAllowed(connectedUser, listOfRequiredRoles, labId)) {
      console.warn(`Admin user ${connectedUser.id} is not allowed for ${listOfRequiredRoles}`)
      // Forbidden
      throw new ForbiddenException(`Required Permissions are missing`)
    }

    // Set it for the actual route
    // res.locals.connectedUser = connectedUser // TODO to be replaced with `authenticatedUser`
    req.locals = {}
    req.locals.authUser = {
      ...connectedUser,
      requestOrganizationId: organizationId,
    }

    // Done
    next()
  }
}
