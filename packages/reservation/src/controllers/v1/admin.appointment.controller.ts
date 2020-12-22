import {NextFunction, Request, Response, Router} from 'express'
import {flatten} from 'lodash'

import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {adminAuthMiddleware} from '../../../../common/src/middlewares/admin.auth'

import {
  AppointmentByOrganizationRequest,
  AppointmentDTO,
  AppointmentUI,
  appointmentUiDTOResponse,
} from '../../models/appoinment'
import {AppoinmentService} from '../../services/appoinment.service'
import {BadRequestException} from '../../../../common/src/exceptions/bad-request-exception'
import {isValidDate} from '../../../../common/src/utils/utils'

class AdminAppointmentController implements IControllerBase {
  public path = '/reservation/admin'
  public router = Router()
  private appointmentService = new AppoinmentService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    innerRouter.get(
      this.path + '/api/v1/appointments',
      adminAuthMiddleware,
      this.getListAppointments,
    )
    innerRouter.get(
      this.path + '/api/v1/appointments/:appointmentId',
      adminAuthMiddleware,
      this.getAppointmentById,
    )
    innerRouter.put(
      this.path + '/api/v1/appointments/:appointmentId/cancel',
      adminAuthMiddleware,
      this.cancelAppointment,
    )

    this.router.use('/', innerRouter)
  }

  getListAppointments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        organizationId,
        searchQuery,
        dateOfAppointment,
      } = req.query as AppointmentByOrganizationRequest

      if (dateOfAppointment && !isValidDate(dateOfAppointment)) {
        throw new BadRequestException('dateOfAppointment is invalid')
      }

      const appointments = await this.appointmentService.getAppointmentByOrganizationIdAndSearchParams(
        organizationId,
        dateOfAppointment,
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

  cancelAppointment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {appointmentId} = req.params as {appointmentId: string}
      const {organizationId} = req.query as {organizationId: string}

      const appointment = await this.appointmentService.getAppointmentById(Number(appointmentId))

      if (!appointment) {
        throw new BadRequestException(`Appointment "${appointmentId}" not found`)
      }

      if (organizationId && appointment.organizationId !== organizationId) {
        throw new BadRequestException(
          `OrganizationId "${organizationId}" does not match appointment "${appointmentId}"`,
        )
      }

      await this.appointmentService.cancelAppointmentById(Number(appointmentId))

      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }
}

export default AdminAppointmentController
