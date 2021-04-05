import {NextFunction, Request, Response, Router} from 'express'

import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed, actionSuccess} from '../../../../../common/src/utils/response-wrapper'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'
import {BadRequestException} from '../../../../../common/src/exceptions/bad-request-exception'

import {PackageService} from '../../../services/package.service'

import {SavePackageAndOrganizationRequest} from '../../../models/packages'
import {AppoinmentService} from '../../../services/appoinment.service'
import {PCRTestResultsService} from '../../../services/pcr-test-results.service'
import {PcrResultTestActivityAction} from '../../../../../reservation/src/models/pcr-test-results'
import {getUserId} from '../../../../../common/src/utils/auth'

class AdminPackageController implements IControllerBase {
  public path = '/reservation/admin'
  public router = Router()
  private packageService = new PackageService()
  private appointmentService = new AppoinmentService()
  private pcrTestResultsService = new PCRTestResultsService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    innerRouter.post(
      this.path + '/api/v1/packages',
      authorizationMiddleware([RequiredUserPermission.OPNAdmin]),
      this.addPackageCode,
    )
    innerRouter.get(
      this.path + '/api/v1/packages',
      authorizationMiddleware([RequiredUserPermission.OPNAdmin]),
      this.getPackageList,
    )
    innerRouter.get(
      this.path + '/api/v1/packages/appointment-credits',
      authorizationMiddleware([RequiredUserPermission.LabOrOrgAppointments]),
      this.getAppointmentCredits,
    )

    this.router.use('/', innerRouter)
  }

  addPackageCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {packageCode, organizationId} = req.body as SavePackageAndOrganizationRequest
      const adminId = getUserId(res.locals.authenticatedUser)

      const isPackageExist = await this.packageService.isExist(packageCode)

      if (isPackageExist) {
        throw new BadRequestException(`Package code ${packageCode} already exist`)
      }

      const resultPackage = await this.packageService.savePackage(packageCode, organizationId)

      const appointments = await this.appointmentService.getAppointmentDBByPackageCode(packageCode)

      await Promise.all(
        appointments.map(async (appointment) => {
          await this.appointmentService.updateAppointmentDB(appointment.id, {organizationId})
          await this.pcrTestResultsService.updateOrganizationIdByAppointmentId(
            appointment.id,
            organizationId,
            PcrResultTestActivityAction.UpdateFromPackage,
            adminId,
          )
        }),
      )

      res.json(actionSuccess(resultPackage, 'Package is added successfully'))
    } catch (error) {
      next(error)
    }
  }

  getPackageList = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {all} = req.query as {all: string}

      const results = await this.packageService.getPackageList(Boolean(all))

      res.json(actionSucceed(results))
    } catch (error) {
      next(error)
    }
  }

  getAppointmentCredits = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {packageCode} = req.query as {packageCode: string}
      const {organizationid} = req.headers as {organizationid: string}

      const credits = await this.packageService.getPackageListByOrgId(packageCode, organizationid)

      res.json(actionSucceed(credits))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminPackageController
