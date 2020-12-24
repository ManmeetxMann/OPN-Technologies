import {NextFunction, Request, Response, Router} from 'express'
import {flatten} from 'lodash'

import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {adminAuthMiddleware} from '../../../../common/src/middlewares/admin.auth'

import {
  AppointmentByOrganizationRequest,
  AppointmentDTO,
  AppointmentStatus,
  AppointmentUI,
  appointmentUiDTOResponse,
  Label,
} from '../../models/appoinment'
import {AppoinmentService} from '../../services/appoinment.service'
import {BadRequestException} from '../../../../common/src/exceptions/bad-request-exception'
import {ResourceNotFoundException} from '../../../../common/src/exceptions/resource-not-found-exception'
import {isValidDate} from '../../../../common/src/utils/utils'
import {now} from '../../../../common/src/utils/times'
import {DuplicateDataException} from '../../../../common/src/exceptions/duplicate-data-exception'

class AdminAppointmentController implements IControllerBase {
  public path = '/reservation/admin/api/v1'
  public router = Router()
  private appointmentService = new AppoinmentService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    innerRouter.get(this.path + '/appointments', adminAuthMiddleware, this.getListAppointments)
    innerRouter.get(
      this.path + '/appointments/:appointmentId',
      adminAuthMiddleware,
      this.getAppointmentById,
    )
    innerRouter.put(
      this.path + '/appointments/:appointmentId/cancel',
      adminAuthMiddleware,
      this.cancelAppointment,
    )
    innerRouter.put(
      this.path + '/api/v1/appointments/add_labels',
      adminAuthMiddleware,
      this.addLabels,
    )
    innerRouter.get(
      this.path + '/api/v1/appointments/barcode/:barCode',
      adminAuthMiddleware,
      this.getAppointmentByBarcode,
    )
    innerRouter.put(
      this.path + '/appointments/:barCode/receive',
      adminAuthMiddleware,
      this.updateTestVoile,
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

      const showCancelled = res.locals.authenticatedUser.admin?.isOpnSuperAdmin ?? false

      const appointments = await this.appointmentService.getAppointmentByOrganizationIdAndSearchParams(
        organizationId,
        dateOfAppointment,
        searchQuery,
        showCancelled,
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

  addLabels = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dataToUpdate = req.body as {appointmentId: number; label: Label}[]

      if (dataToUpdate.length > 50) {
        throw new BadRequestException('Maximum appointments to be part of request is 50')
      }

      const result = await Promise.all(
        dataToUpdate.map(async ({appointmentId, label}) => {
          const appointment = await this.appointmentService.addAppointmentLabel(
            Number(appointmentId),
            {[label]: label},
          )

          return appointmentUiDTOResponse(appointment)
        }),
      )

      res.json(actionSucceed(result))
    } catch (error) {
      next(error)
    }
  }

  getAppointmentByBarcode = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {barCode} = req.params as {barCode: string}

      const appointment = await this.appointmentService.getAppoinmentByBarCode(barCode)

      if (!appointment) {
        throw new ResourceNotFoundException(`Appointment with barCode ${barCode} not found`)
      }

      res.json(actionSucceed({...appointmentUiDTOResponse(appointment)}))
    } catch (error) {
      next(error)
    }
  }

  updateTestVoile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {barCode} = req.params as {barCode: string}
      const {location} = req.body as {location: string}

      const appointment = await this.appointmentService.getAppoinmentDBByBarCode(barCode)

      if (appointment.length > 1) {
        throw new DuplicateDataException(
          `Sorry, Results are not sent. Same Barcode is used by multiple appointments`,
        )
      }

      const result = await this.appointmentService.updateAppointmentDB(appointment[0].id, {
        appointmentStatus: AppointmentStatus.received,
        location,
        receivedAt: now(),
      })

      res.json(actionSucceed(result))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminAppointmentController
