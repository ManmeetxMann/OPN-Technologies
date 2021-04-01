import {NextFunction, Request, Response, Router} from 'express'

import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'

import {DeadlineLabel} from '../../../models/appointment'
import {AppoinmentService} from '../../../services/appoinment.service'
import {BadRequestException} from '../../../../../common/src/exceptions/bad-request-exception'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'
import {AppointmentBulkAction, BulkOperationResponse} from '../../../types/bulk-operation.type'

class AdminAppointmentController implements IControllerBase {
  public path = '/reservation/admin/api/v2'
  public router = Router()
  private appointmentService = new AppoinmentService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    innerRouter.put(
      this.path + '/appointments/add-labels',
      authorizationMiddleware([RequiredUserPermission.LabAppointments]),
      this.addLabels,
    )

    this.router.use('/', innerRouter)
  }

  addLabels = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {appointmentIds, label} = req.body as {appointmentIds: string[]; label: DeadlineLabel}

      if (appointmentIds.length > 50) {
        throw new BadRequestException('Maximum appointments to be part of request is 50')
      }

      const appointmentsState: BulkOperationResponse[] = await Promise.all(
        appointmentIds.map(async (appointmentId) => {
          return this.appointmentService.makeBulkAction(
            appointmentId,
            {label: label.toUpperCase() as DeadlineLabel},
            AppointmentBulkAction.AddAppointmentLabel,
          )
        }),
      )

      res.json(actionSucceed(appointmentsState))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminAppointmentController
