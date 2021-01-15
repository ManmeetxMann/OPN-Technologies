import {NextFunction, Request, Response, Router} from 'express'

import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {adminAuthMiddleware} from '../../../../common/src/middlewares/admin.auth'

import {appointmentUiDTOResponse, DeadlineLabel} from '../../models/appointment'
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
      const {appointmentIds, label} = req.body as {appointmentIds: string[]; label: DeadlineLabel}

      if (appointmentIds.length > 50) {
        throw new BadRequestException('Maximum appointments to be part of request is 50')
      }

      const appointments = await this.appointmentService.getAppointmentsDBByIds(appointmentIds)
      const result = []

      await Promise.all(
        appointments.map(async (appointmentDb) => {
          await this.appointmentService.addAppointmentLabel(
            appointmentDb.acuityAppointmentId,
            label,
          )

          result.push(appointmentUiDTOResponse(appointmentDb))
        }),
      )

      res.json(actionSucceed(result))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminAppointmentController
