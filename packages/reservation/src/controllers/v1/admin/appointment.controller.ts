import {NextFunction, Request, Response, Router} from 'express'

import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'
import {BadRequestException} from '../../../../../common/src/exceptions/bad-request-exception'
import {ResourceNotFoundException} from '../../../../../common/src/exceptions/resource-not-found-exception'
import {isValidDate} from '../../../../../common/src/utils/times'
import {getAdminId, getIsLabUser} from '../../../../../common/src/utils/auth'

import {
  AppointmentByOrganizationRequest,
  AppointmentDBModel,
  AppointmentsState,
  appointmentUiDTOResponse,
} from '../../../models/appointment'
import {AppoinmentService} from '../../../services/appoinment.service'
import {TransportRunsService} from '../../../services/transport-runs.service'

const isJustOneOf = (a: unknown, b: unknown) => !(a && b) || !(!a && !b)

class AdminAppointmentController implements IControllerBase {
  public path = '/reservation/admin'
  public router = Router()
  private appointmentService = new AppoinmentService()
  private transportRunsService = new TransportRunsService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    const apptAuth = authorizationMiddleware([RequiredUserPermission.LabAppointments])
    const apptAuthWithOrg = authorizationMiddleware([RequiredUserPermission.LabAppointments], true)
    const receivingAuth = authorizationMiddleware([RequiredUserPermission.LabReceiving])
    innerRouter.get(this.path + '/api/v1/appointments', apptAuthWithOrg, this.getListAppointments)
    innerRouter.get(
      this.path + '/api/v1/appointments/:appointmentId',
      apptAuth,
      this.getAppointmentById,
    )
    innerRouter.put(
      this.path + '/api/v1/appointments/:appointmentId/cancel',
      apptAuthWithOrg,
      this.cancelAppointment,
    )
    innerRouter.put(
      this.path + '/api/v1/appointments/add-transport-run',
      apptAuth,
      this.addTransportRun,
    )
    innerRouter.get(
      this.path + '/api/v1/appointments/barcode/:barCode',
      apptAuth,
      this.getAppointmentByBarcode,
    )
    innerRouter.put(this.path + '/api/v1/appointments/receive', receivingAuth, this.addVialLocation)

    this.router.use('/', innerRouter)
  }

  getListAppointments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        appointmentStatus,
        barCode,
        dateOfAppointment,
        organizationId,
        searchQuery,
        transportRunId,
      } = req.query as AppointmentByOrganizationRequest

      if (dateOfAppointment && !isValidDate(dateOfAppointment)) {
        throw new BadRequestException('dateOfAppointment is invalid')
      }

      const appointments = await this.appointmentService.getAppointmentsDB({
        appointmentStatus,
        barCode,
        organizationId,
        dateOfAppointment,
        searchQuery,
        transportRunId,
      })

      res.json(
        actionSucceed(
          appointments.map((appointment: AppointmentDBModel) => ({
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
      const isLabUser = getIsLabUser(res.locals.authenticatedUser)

      const appointment = await this.appointmentService.getAppointmentDBByIdWithCancel(
        appointmentId,
        isLabUser,
      )
      if (!appointment) {
        throw new ResourceNotFoundException(`Appointment "${appointmentId}" not found`)
      }

      res.json(
        actionSucceed({
          ...appointmentUiDTOResponse(appointment),
        }),
      )
    } catch (error) {
      next(error)
    }
  }

  cancelAppointment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = getAdminId(res.locals.authenticatedUser)
      const isLabUser = getIsLabUser(res.locals.authenticatedUser)

      const {appointmentId} = req.params as {appointmentId: string}
      const {organizationId} = req.query as {organizationId: string}

      await this.appointmentService.cancelAppointment(
        appointmentId,
        adminId,
        isLabUser,
        organizationId,
      )

      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }

  addTransportRun = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = getAdminId(res.locals.authenticatedUser)

      const {appointmentIds, transportRunId} = req.body as {
        appointmentIds: string[]
        transportRunId: string
      }
      const transportRuns = await this.transportRunsService.getByTransportRunId(transportRunId)
      if (transportRuns.length > 1) {
        console.log(`More than 1 result for the transportRunId ${transportRunId}`)
      } else if (transportRuns.length === 0) {
        throw new ResourceNotFoundException(`Transport Run for the id ${transportRunId} Not found`)
      }

      const appointmentsState: AppointmentsState[] = await Promise.all(
        appointmentIds.map(async (appointmentId) => ({
          appointmentId,
          state: await this.appointmentService.addTransportRun(
            appointmentId,
            transportRunId,
            adminId,
          ),
        })),
      )

      res.json(actionSucceed(appointmentsState))
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

      const appointment = await this.appointmentService.getAppointmentByBarCode(barCode)

      res.json(actionSucceed({...appointmentUiDTOResponse(appointment)}))
    } catch (error) {
      next(error)
    }
  }

  addVialLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = getAdminId(res.locals.authenticatedUser)

      const {appointmentIds, vialLocation} = req.body as {
        appointmentIds: string[]
        vialLocation: string
      }

      if (appointmentIds.length > 50) {
        throw new BadRequestException('Allowed maximum 50 appointments in array')
      }

      await Promise.all(
        appointmentIds.map((appointment) => {
          return this.appointmentService.makeReceived(appointment, vialLocation, adminId)
        }),
      )

      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }
}

export default AdminAppointmentController
