import * as express from 'express'
import {NextFunction, Request, Response} from 'express'

import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {InternalAdminApprovalCreateRequest} from '../models/internal-request'
import {actionSucceed} from '../../../common/src/utils/response-wrapper'
import {AdminApprovalService} from '../../../common/src/service/user/admin-service'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {OrganizationService} from '../services/organization-service'

class InternalController implements IControllerBase {
  public path = '/internal'
  public router = express.Router()

  private organizationService = new OrganizationService()
  private adminApprovalService = new AdminApprovalService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.post(this.path + '/admin/operations/create', this.internalAdminApprovalCreate)
    this.router.post(this.path + '/admin/operations/list', this.internalAdminList)
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
        showReporting,
        groupIds,
      } = req.body as InternalAdminApprovalCreateRequest

      // Make sure it does not exist
      const approval = await this.adminApprovalService.findOneByEmail(email)
      if (approval) {
        throw new BadRequestException('Unauthorized Access')
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
