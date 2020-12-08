import {NextFunction, Request, Response, Router} from 'express'
import {flatten} from 'lodash'

import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {authMiddleware} from '../../../../common/src/middlewares/auth'

import {
  AppointmentByOrganizationRequest,
  AppointmentDTO,
  AppointmentUI,
  appointmentUiDTOResponse,
} from '../../models/appoinment'
import {AppoinmentService} from '../../services/appoinment.service'

class AdminAppointmentController implements IControllerBase {
  public path = '/reservation/admin'
  public router = Router()
  private appointmentService = new AppoinmentService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    innerRouter.get(this.path + '/api/v1/appointments', authMiddleware, this.getListAppointments)
    innerRouter.get(
      this.path + '/api/v1/appointments/:appointmentId',
      authMiddleware,
      this.getAppointmentById,
    )

    this.router.use('/', innerRouter)
  }

  getListAppointments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId} = req.query as AppointmentByOrganizationRequest

      const appointments = await this.appointmentService.getAppointmentByOrganizationIdAndSearchParams(
        organizationId,
        searchQuery,
      )

      const appointmentsUniqueById = [
        ...new Map(flatten(appointments).map((item) => [item.id, item])).values(),
      ]

      res.json(
        actionSucceed(
          appointmentsUniqueById.map((appointment: AppointmentDTO | AppointmentUI) => ({
            ...appointmentUiDTOResponse(appointment),
          })),
        ),
      )
    } catch (error) {
      next(error)
    }
  }

  getAppointmentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {appointmentId} = req.params as {appointmentId: string}

      const appointment = await this.appointmentService.getAppointmentById(Number(appointmentId))

      res.json(actionSucceed({...appointmentUiDTOResponse(appointment)}))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminAppointmentController
