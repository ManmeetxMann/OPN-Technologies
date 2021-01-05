import {NextFunction, Request, Response, Router} from 'express'

import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {adminAuthMiddleware} from '../../../../common/src/middlewares/admin.auth'

import {
  AppointmentByOrganizationRequest,
  AppointmentStatus,
  appointmentUiDTOResponse,
  Label,
  AppointmentsState,
  AppointmentDBModel,
} from '../../models/appointment'
import {AppoinmentService} from '../../services/appoinment.service'
import {BadRequestException} from '../../../../common/src/exceptions/bad-request-exception'
import {ResourceNotFoundException} from '../../../../common/src/exceptions/resource-not-found-exception'
import {now, isValidDate} from '../../../../common/src/utils/times'
import {DuplicateDataException} from '../../../../common/src/exceptions/duplicate-data-exception'
import {TransportRunsService} from '../../services/transport-runs.service'

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
    innerRouter.put(
      this.path + '/api/v1/appointments/add-transport-run',
      adminAuthMiddleware,
      this.addTransportRun,
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
      this.path + '/api/v1/appointments/:barCode/receive',
      adminAuthMiddleware,
      this.updateTestVoile,
    )
    innerRouter.put(
      this.path + '/api/v1/appointments/add-test-run',
      adminAuthMiddleware,
      this.addTestRunToAppointments,
    )

    this.router.use('/', innerRouter)
  }

  getListAppointments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        organizationId,
        searchQuery,
        dateOfAppointment,
        transportRunId,
      } = req.query as AppointmentByOrganizationRequest

      if (dateOfAppointment && !isValidDate(dateOfAppointment)) {
        throw new BadRequestException('dateOfAppointment is invalid')
      }

      const appointments = await this.appointmentService.getAppointmentsDB({
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

      const appointment = await this.appointmentService.getAppointmentByAcuityId(
        Number(appointmentId),
      )

      res.json(actionSucceed({...appointmentUiDTOResponse(appointment)}))
    } catch (error) {
      next(error)
    }
  }

  cancelAppointment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {appointmentId} = req.params as {appointmentId: string}
      const {organizationId} = req.query as {organizationId: string}

      const appointment = await this.appointmentService.getAppointmentByAcuityId(
        Number(appointmentId),
      )

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
  addTransportRun = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
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
          state: await this.appointmentService.addTransportRun(appointmentId, transportRunId),
        })),
      )

      res.json(actionSucceed(appointmentsState))
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
          await this.appointmentService.addAppointmentLabel(
            Number(appointmentId),
            {[label]: label},
          )

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

  updateTestVoile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {barCode} = req.params as {barCode: string}
      const {location} = req.body as {location: string}
      const blockDuplicate = true
      const appointment = await this.appointmentService.getAppointmentByBarCode(barCode, blockDuplicate)

      await this.appointmentService.updateAppointmentDB(appointment.id, {
        appointmentStatus: AppointmentStatus.received,
        location,
        receivedAt: now(),
      })

      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }

  addTestRunToAppointments = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {appointmentIds, testRunId} = req.body as {
        appointmentIds: string[]
        testRunId: string[]
      }

      if (appointmentIds.length > 50) {
        throw new BadRequestException('Maximum appointments to be part of request is 50')
      }

      await Promise.all(
        appointmentIds.map((id) => {
          this.appointmentService.updateAppointmentDB(id, {
            testRunId,
            appointmentStatus: AppointmentStatus.inProgress,
            inProgressAt: now(),
          })
        }),
      )

      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }
}

export default AdminAppointmentController
