import {NextFunction, Request, Response, Router} from 'express'

import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {authMiddleware} from '../../../../common/src/middlewares/auth'
import {BadRequestException} from '../../../../common/src/exceptions/bad-request-exception'

import {PackageService} from '../../services/package.service'

import packageValidations from '../../validations/package.validations'
import {SavePackageAndOrganizationRequest} from '../../models/packages'
import { AppoinmentService } from '../../services/appoinment.service'
import { PCRTestResultsService } from '../../services/pcr-test-results.service'


class AdminController implements IControllerBase {
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
      // authMiddleware,
      packageValidations.packageValidation(),
      this.addPackageCode,
    )
    innerRouter.get(this.path + '/api/v1/packages', authMiddleware, this.getPackageList)

    this.router.use('/', innerRouter)
  }

  addPackageCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {packageCode, organizationId} = req.body as SavePackageAndOrganizationRequest

      const isPackageExist = await this.packageService.isExist(packageCode)

      if (isPackageExist) {
        throw new BadRequestException(`Package code ${packageCode} already exist`)
      }

      const results = await this.packageService.savePackage(packageCode, organizationId)

      console.warn(`${results} updated for the organization ${organizationId}`)

      const appointments = await this.appointmentService.getAppointmentDBByPackageCode(packageCode)

      await Promise.all(appointments.map(async appointment => {
        await this.appointmentService.updateAppointmentDB(
          appointment.id,
          {organizationId},
        )
        await this.pcrTestResultsService.updateOrganizationIdByAppointmentId(appointment.id, organizationId)
      }))

      res.json(actionSucceed())
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
}

export default AdminController
