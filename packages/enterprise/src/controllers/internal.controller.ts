import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../common/src/utils/response-wrapper'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {AdminApprovalService} from '../../../common/src/service/user/admin-service'
import {PdfService} from '../../../common/src/service/reports/pdf'

import {EmailService} from '../services/email-service'
import UploadService from '../services/upload-service'
import {OrganizationService} from '../services/organization-service'
import {ReportService} from '../services/report-service'
import {InternalAdminApprovalCreateRequest} from '../models/internal-request'

import {QuestionnaireService} from '../../../lookup/src/services/questionnaire-service'

import {Router, NextFunction, Request, Response} from 'express'
import * as _ from 'lodash'

type GroupReportEmailRequest = {
  groupId: string
  organizationId: string
  email: string
  name: string
  from: string
  to: string
}

class InternalController implements IControllerBase {
  private path = '/internal'
  public router = Router()

  private organizationService = new OrganizationService()
  private adminApprovalService = new AdminApprovalService()
  private pdfService = new PdfService()
  private reportService = new ReportService()
  private questionnaireService = new QuestionnaireService()
  private emailService = new EmailService()
  private uploadService = new UploadService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.post(this.path + '/admin/operations/create', this.internalAdminApprovalCreate)
    this.router.post(this.path + '/admin/operations/list', this.internalAdminList)
    this.router.post(this.path + '/group-report/', this.emailGroupReport)
  }

  emailGroupReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {groupId, organizationId, email, name, from, to} = req.body as GroupReportEmailRequest

      const memberships = await this.organizationService.getUsersGroups(organizationId, groupId)
      const userIds = new Set<string>()
      memberships.forEach((membership) => {
        if (membership.parentUserId) {
          userIds.add(membership.parentUserId)
        }
        userIds.add(membership.userId)
      })
      console.log(`${memberships.length} memberships found`)

      const [organization, lookups] = await Promise.all([
        this.organizationService.findOneById(organizationId),
        this.reportService.getLookups(userIds, organizationId),
      ])
      const questionnaire = await this.questionnaireService.getQuestionnaire(
        organization.questionnaireId,
      )
      console.log(`lookups retrieved`)

      const allTemplates = await Promise.all(
        memberships
          .filter((membership) => lookups.usersLookup[membership.userId])
          .map((membership) =>
            this.reportService
              .getUserReportTemplate(
                organization,
                membership.userId,
                membership.parentUserId,
                from,
                to,
                lookups,
                [questionnaire],
              )
              .catch((err) => {
                console.warn(`error getting content for ${JSON.stringify(membership)} - ${err}`)
                return {
                  content: [],
                  tableLayouts: null,
                }
              }),
          ),
      )
      console.log(`generated ${allTemplates.length} templates`)
      const tableLayouts = allTemplates.find(({tableLayouts}) => tableLayouts !== null).tableLayouts
      const content = _.flatten(_.map(allTemplates, 'content'))
      console.log(`generating pdf with ${content.length} elements`)
      const pdfStream = await this.pdfService.generatePDFStream(content, tableLayouts)
      console.log('uploading pdf')
      const filePath = await this.uploadService.uploadReport(pdfStream)
      console.log('sending email')
      await this.emailService.sendGroupReport(email, name, filePath)
      res.sendStatus(200)
    } catch (error) {
      next(error)
    }
  }

  internalAdminApprovalCreate = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {
        email,
        locationIds,
        organizationId,
        superAdminForOrganizationIds,
        healthAdminForOrganizationIds,
        nfcAdminForOrganizationIds,
        nfcGateKioskAdminForOrganizationIds,
        showReporting,
        groupIds,
        isManagementDashboardAdmin,
        isTestReportsAdmin,
        isTestAppointmentsAdmin,
        isOpnSuperAdmin,
        isLabUser,
        isLabAppointmentsAdmin,
        isLabResultsAdmin,
        isTransportsRunsAdmin,
        isReceivingAdmin,
        isTestRunsAdmin,
        isTestKitBatchAdmin,
        isDueTodayAdmin,
        isBulkUploadAdmin,
        isSingleResultSendAdmin,
        isConfirmResultAdmin,
        isPackageAdmin,
        isCheckInAdmin,
        isGenerateAdmin,
        isLookupAdmin,
        adminForLabIds,
        isClinicUser,
        isRapidResultSenderAdmin,
        isRapidResultOrgAdmin,
        isOrganizeAdmin,
      } = req.body as InternalAdminApprovalCreateRequest

      // Make sure it does not exist
      const approval = await this.adminApprovalService.findOneByEmail(email)
      if (approval) {
        throw new BadRequestException(`Unauthorized Access got ${approval.id}`)
      }

      // Check if we have approval for this admin
      await this.adminApprovalService.create({
        email: email.toLowerCase(),
        enabled: true,
        showReporting: showReporting ?? false,
        adminForLocationIds: locationIds,
        adminForOrganizationId: organizationId,
        adminForGroupIds: groupIds ?? [],
        superAdminForOrganizationIds: superAdminForOrganizationIds ?? [],
        healthAdminForOrganizationIds: healthAdminForOrganizationIds ?? [],
        nfcAdminForOrganizationIds: nfcAdminForOrganizationIds ?? [],
        nfcGateKioskAdminForOrganizationIds: nfcGateKioskAdminForOrganizationIds ?? [],
        isOpnSuperAdmin: isOpnSuperAdmin ?? false,
        isManagementDashboardAdmin: isManagementDashboardAdmin ?? false,
        isTestReportsAdmin: isTestReportsAdmin ?? false,
        isTestAppointmentsAdmin: isTestAppointmentsAdmin ?? false,
        isLabUser: isLabUser ?? false,
        isLabAppointmentsAdmin: isLabAppointmentsAdmin ?? false,
        isLabResultsAdmin: isLabResultsAdmin ?? false,
        isTransportsRunsAdmin: isTransportsRunsAdmin ?? false,
        isReceivingAdmin: isReceivingAdmin ?? false,
        isTestRunsAdmin: isTestRunsAdmin ?? false,
        isTestKitBatchAdmin: isTestKitBatchAdmin ?? false,
        isDueTodayAdmin: isDueTodayAdmin ?? false,
        isBulkUploadAdmin: isBulkUploadAdmin ?? false,
        isSingleResultSendAdmin: isSingleResultSendAdmin ?? false,
        isConfirmResultAdmin: isConfirmResultAdmin ?? false,
        isPackageAdmin: isPackageAdmin ?? false,
        isCheckInAdmin: isCheckInAdmin ?? false,
        isGenerateAdmin: isGenerateAdmin ?? false,
        isLookupAdmin: isLookupAdmin ?? false,
        isClinicUser: isClinicUser ?? false,
        adminForLabIds: adminForLabIds ?? [],
        isRapidResultSenderAdmin: isRapidResultSenderAdmin ?? false,
        isRapidResultOrgAdmin: isRapidResultOrgAdmin ?? false,
        isOrganizeAdmin: isOrganizeAdmin ?? false,
        isPatientsAdmin: isPackageAdmin ?? false,
      })
      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }

  internalAdminList = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId} = req.body

      const responseByGroups = []
      const responseByLocations = []

      // Get Groups
      const groups = await this.organizationService.getGroups(organizationId)
      for (const group of groups) {
        const groupId = group.id

        // Get Admins from approvals
        const approvals = await this.adminApprovalService.findAllByOrgAndGroup(
          organizationId,
          groupId,
        )
        const admins = approvals.map((approval) => approval.profile.email)
        responseByGroups.push({groupId: groupId, groupName: group.name, admins: admins})
      }

      // Get all sub locations (aka zones as well)
      const locations = await this.organizationService.getLocations(organizationId)
      const allLocations = locations
      for (const location of locations) {
        const subLocations = await this.organizationService.getLocations(
          organizationId,
          location.id,
        )
        allLocations.concat(subLocations)
      }

      // Add them
      for (const location of allLocations) {
        // Deal with location
        const locationId = location.id
        const approvals = await this.adminApprovalService.findAllByOrgAndLocation(
          organizationId,
          locationId,
        )
        const admins = approvals.map((approval) => approval.profile.email)
        responseByLocations.push({
          locationId: locationId,
          locationName: location.title,
          admins: admins,
        })
      }

      res.json(actionSucceed({byGroup: responseByGroups, byLocation: responseByLocations}))
    } catch (error) {
      next(error)
    }
  }
}

export default InternalController
