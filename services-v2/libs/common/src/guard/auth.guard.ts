import {CanActivate, ExecutionContext, Injectable} from '@nestjs/common'
import {ForbiddenException} from '@opn-services/common/exception'
import {Reflector} from '@nestjs/core'
import {RequiredUserPermission, RolesData} from '../types/authorization'
import {AdminProfile} from '@opn-common-v1/data/admin'
import {User} from '@opn-common-v1/data/user'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rolesData: RolesData = this.reflector.get('roles', context.getHandler())

    if (!rolesData?.requiredRoles.length) {
      return true
    }

    const req = context.switchToHttp().getRequest()

    await this.validateRoles(req.raw.locals.authUser, rolesData)

    return true
  }

  private async validateRoles(user, rolesData: RolesData) {
    const {requestOrganizationId: organizationId, requestLabId: labId} = user
    const {requiredRoles, requireOrg} = rolesData
    const admin = user.admin as AdminProfile

    const seekRegularAuth = requiredRoles.includes(RequiredUserPermission.RegUser)
    const seekAdminAuth = requiredRoles.some(role => role !== RequiredUserPermission.RegUser)
    const gotAdminAuth = seekAdminAuth && user.admin ? true : false

    if (requireOrg) {
      if (!organizationId) {
        if (!this.authorizedWithoutOrgId(admin, organizationId)) {
          console.warn(`${user.id} did not provide an organizationId`)
          throw new ForbiddenException(`Organization ID not provided`)
        }
      } else if (gotAdminAuth) {
        // user authenticated as an admin, needs to be valid
        if (!this.isAllowed(user, requiredRoles, labId)) {
          console.warn(`${organizationId} is not accesible to ${user.id}`)
          throw new ForbiddenException(`Organization ID ${organizationId} is not accesible`)
        }
      } else {
        if (!seekRegularAuth) {
          // not an admin but admin required
          console.warn(`${organizationId} is not admin-accesible to ${user.id}`)
          throw new ForbiddenException(`Organization ID ${organizationId} is not accesible`)
        }

        // just need to be a member of the organization
        if (!(user.organizationIds ?? []).includes(organizationId)) {
          console.warn(`${organizationId} is not connected to ${user.id}`)
          throw new ForbiddenException(`Organization ID ${organizationId} is not accesible`)
        }
      }
    }

    // this check is only required for admins
    if (gotAdminAuth && !this.isAllowed(user, requiredRoles, labId)) {
      console.warn(`Admin user ${user.id} is not allowed for ${requiredRoles}`)
      throw new ForbiddenException(`Required Permissions are missing`)
    }

    return true
  }

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

  /* eslint-disable  max-lines-per-function, complexity */
  private isAllowed = (
    user: User,
    listOfRequiredPermissions: RequiredUserPermission[],
    labId: string,
  ): boolean => {
    const admin = user.admin as AdminProfile | null
    const userId = user.id
    if (admin?.isOpnSuperAdmin) {
      //Super Admin has all permissions
      console.warn(`SuperAdmin Permissions used for userID: ${user.id}`)
      return true
    }

    const seekLabAdmin = listOfRequiredPermissions.includes(RequiredUserPermission.LabAdmin)
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
    const seekPatientsAdmin = listOfRequiredPermissions.includes(
      RequiredUserPermission.PatientsAdmin,
    )

    const labUserWithLabId = admin.isLabUser && !labId ? false : true

    if ((seekLabAdmin && !admin.isLabUser) || !labUserWithLabId) {
      console.warn(`Admin user ${userId} needs isLabUser`)
      return false
    }
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
    if (seekPatientsAdmin && !admin?.isPatientsAdmin && !admin?.isOpnSuperAdmin) {
      console.warn(`Admin user ${userId} needs isPatientsAdmin`)
      return false
    }
    return true
  }
}
