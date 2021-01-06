import {NextFunction, Request, Response, Router} from 'express'

import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {adminAuthMiddleware} from '../../../../common/src/middlewares/admin.auth'

import {appointmentUiDTOResponse, Label} from '../../models/appointment'
import {AppoinmentService} from '../../services/appoinment.service'
import {BadRequestException} from '../../../../common/src/exceptions/bad-request-exception'

class AdminAppointmentController implements IControllerBase {
  public path = '/reservation/admin/api/v2'
  public router = Router()
  private appointmentService = new AppoinmentService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    innerRouter.put(this.path + '/appointments/add-labels', adminAuthMiddleware, this.addLabels)

    this.router.use('/', innerRouter)
  }

  addLabels = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {appointmentIds, label} = req.body as {appointmentIds: string[]; label: Label}

      if (appointmentIds.length > 50) {
        throw new BadRequestException('Maximum appointments to be part of request is 50')
      }

      const result = await Promise.all(
        appointmentIds.map(async (appointmentId) => {
          await this.appointmentService.addAppointmentLabel(appointmentId, {[label]: label})

          const appointmentDb = await this.appointmentService.getAppointmentByAcuityId(
            appointmentId,
          )

          return appointmentDb ? appointmentUiDTOResponse(appointmentDb) : null
        }),
      )

      res.json(actionSucceed(result))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminAppointmentController
