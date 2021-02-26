import {NextFunction, Request, Response, Router} from 'express'

import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed, actionSuccess} from '../../../../../common/src/utils/response-wrapper'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'
import {BadRequestException} from '../../../../../common/src/exceptions/bad-request-exception'
import {ResourceNotFoundException} from '../../../../../common/src/exceptions/resource-not-found-exception'
import {isValidDate} from '../../../../../common/src/utils/times'
import {getIsLabUser, getUserId} from '../../../../../common/src/utils/auth'
import {fromPairs} from 'lodash'

import {
  appointmentByBarcodeUiDTOResponse,
  AppointmentByOrganizationRequest,
  AppointmentDBModel,
  statsUiDTOResponse,
  appointmentUiDTOResponse,
  AppointmentAcuityResponse,
} from '../../../models/appointment'
import {AppoinmentService} from '../../../services/appoinment.service'
import {OrganizationService} from '../../../../../enterprise/src/services/organization-service'
import {TransportRunsService} from '../../../services/transport-runs.service'
import {AppointmentBulkAction, BulkOperationResponse} from '../../../types/bulk-operation.type'

class AdminAppointmentController implements IControllerBase {
  public path = '/reservation/admin'
  public router = Router()
  private appointmentService = new AppoinmentService()
  private organizationService = new OrganizationService()
  private transportRunsService = new TransportRunsService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    const apptLabAuth = authorizationMiddleware([RequiredUserPermission.LabAppointments])
    const apptLabOrOrgAdminAuth = authorizationMiddleware([
      RequiredUserPermission.LabOrOrgAppointments,
    ])
    const apptLabOrOrgAdminAuthWithOrg = authorizationMiddleware(
      [RequiredUserPermission.LabOrOrgAppointments],
      true,
    )
    const receivingAuth = authorizationMiddleware([RequiredUserPermission.LabReceiving])
    const allowCheckIn = authorizationMiddleware([RequiredUserPermission.AllowCheckIn])
    const idBarCodeToolAuth = authorizationMiddleware([
      RequiredUserPermission.LabAdminToolIDBarcode,
    ])
    innerRouter.get(
      this.path + '/api/v1/appointments',
      apptLabOrOrgAdminAuthWithOrg,
      this.getListAppointments,
    )
    innerRouter.get(
      this.path + '/api/v1/appointments/:appointmentId',
      apptLabOrOrgAdminAuth,
      this.getAppointmentById,
    )
    innerRouter.put(
      this.path + '/api/v1/appointments/:appointmentId/cancel',
      apptLabOrOrgAdminAuth,
      this.cancelAppointment,
    )

    innerRouter.put(
      this.path + '/api/v1/appointments/add-transport-run',
      apptLabAuth,
      this.addTransportRun,
    )
    innerRouter.get(
      this.path + '/api/v1/appointments/barcode/lookup',
      idBarCodeToolAuth,
      this.getAppointmentByBarcode,
    )
    innerRouter.get(
      this.path + '/api/v1/appointments/barcode/get-new-code',
      idBarCodeToolAuth,
      this.getNextBarcode,
    )
    innerRouter.get(
      this.path + '/api/v1/appointments/list/stats',
      apptLabAuth,
      this.appointmentsStats,
    )
    innerRouter.put(this.path + '/api/v1/appointments/receive', receivingAuth, this.addVialLocation)
    innerRouter.put(
      this.path + '/api/v1/appointments/:appointmentId/check-in',
      allowCheckIn,
      this.makeCheckIn,
    )
    innerRouter.put(
      this.path + '/api/v1/appointments/barcode/regenerate',
      apptLabAuth,
      this.regenerateBarCode,
    )
    innerRouter.put(
      this.path + '/api/v1/appointments/:appointmentId/reschedule',
      apptLabAuth,
      this.rescheduleAppointment,
    )

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
      if (organizationId && !dateOfAppointment) {
        throw new BadRequestException('dateOfAppointment is required')
      }
      if (appointmentStatus && !dateOfAppointment) {
        throw new BadRequestException('dateOfAppointment is required')
      }

      const isLabUser = getIsLabUser(res.locals.authenticatedUser)

      const appointments = await this.appointmentService.getAppointmentsDB({
        appointmentStatus,
        barCode,
        organizationId,
        dateOfAppointment,
        searchQuery,
        transportRunId,
      })

      const transportRuns = fromPairs(
        (
          await this.transportRunsService.getByTransportRunIdBulk(
            appointments
              .map((appointment) => appointment.transportRunId)
              .filter((appointment) => !!appointment),
          )
        ).map((transportRun) => [transportRun.transportRunId, transportRun.label]),
      )

      res.json(
        actionSucceed(
          appointments.map((appointment: AppointmentDBModel) => ({
            ...appointmentUiDTOResponse(
              appointment,
              isLabUser,
              transportRuns[appointment.transportRunId],
            ),
          })),
        ),
      )
    } catch (error) {
      next(error)
    }
  }

  appointmentsStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

      const {
        appointmentStatusArray,
        orgIdArray,
        total,
      } = await this.appointmentService.getAppointmentsStats(
        appointmentStatus,
        barCode,
        organizationId,
        dateOfAppointment,
        searchQuery,
        transportRunId,
      )

      res.json(actionSucceed(statsUiDTOResponse(appointmentStatusArray, orgIdArray, total)))
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
          ...appointmentUiDTOResponse(appointment, isLabUser),
        }),
      )
    } catch (error) {
      next(error)
    }
  }

  cancelAppointment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = getUserId(res.locals.authenticatedUser)
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
      const adminId = getUserId(res.locals.authenticatedUser)

      const {appointmentIds, transportRunId} = req.body as {
        appointmentIds: string[]
        transportRunId: string
      }

      const {
        failed,
        filtredAppointmentIds,
      } = await this.appointmentService.checkDuplicatedAndMissedAppointments(appointmentIds)

      const transportRuns = await this.transportRunsService.getByTransportRunId(transportRunId)
      if (transportRuns.length > 1) {
        console.log(`More than 1 result for the transportRunId ${transportRunId}`)
      } else if (transportRuns.length === 0) {
        throw new ResourceNotFoundException(`Transport Run for the id ${transportRunId} Not found`)
      }

      const appointmentsState: BulkOperationResponse[] = await Promise.all(
        filtredAppointmentIds.map(async (appointmentId) => {
          return this.appointmentService.makeBulkAction(
            appointmentId,
            {
              transportRunId,
              userId: adminId,
            },
            AppointmentBulkAction.AddTransportRun,
          )
        }),
      )

      res.json(actionSuccess([...appointmentsState, ...failed]))
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
      const {barCode} = req.query as {barCode: string}

      const appointment = await this.appointmentService.getAppointmentByBarCode(barCode)
      let organizationName: string
      if (appointment.organizationId) {
        const organization = await this.organizationService.getByIdOrThrow(
          appointment.organizationId,
        )
        organizationName = organization.name
      }
      res.json(actionSucceed({...appointmentByBarcodeUiDTOResponse(appointment, organizationName)}))
    } catch (error) {
      next(error)
    }
  }

  getNextBarcode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const barCode = await this.appointmentService.getNextBarCodeNumber()
      res.json(actionSucceed({barCode}))
    } catch (error) {
      next(error)
    }
  }

  addVialLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = getUserId(res.locals.authenticatedUser)

      const {appointmentIds, vialLocation} = req.body as {
        appointmentIds: string[]
        vialLocation: string
      }

      if (appointmentIds.length > 50) {
        throw new BadRequestException('Allowed maximum 50 appointments in array')
      }

      const {
        failed,
        filtredAppointmentIds,
      } = await this.appointmentService.checkDuplicatedAndMissedAppointments(appointmentIds)

      const appointmentsState: BulkOperationResponse[] = await Promise.all(
        filtredAppointmentIds.map(async (appointmentId) => {
          return this.appointmentService.makeBulkAction(
            appointmentId,
            {
              vialLocation,
              userId: adminId,
            },
            AppointmentBulkAction.MakeRecived,
          )
        }),
      )

      res.json(actionSuccess([...appointmentsState, ...failed]))
    } catch (error) {
      next(error)
    }
  }

  makeCheckIn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = getUserId(res.locals.authenticatedUser)
      const isLabUser = getIsLabUser(res.locals.authenticatedUser)

      const {appointmentId} = req.params as {
        appointmentId: string
      }

      const updatedAppointment = await this.appointmentService.makeCheckIn(appointmentId, adminId)

      res.json(actionSucceed(appointmentUiDTOResponse(updatedAppointment, isLabUser)))
    } catch (error) {
      next(error)
    }
  }

  regenerateBarCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {appointmentId} = req.body as {appointmentId: string}
      const userId = getUserId(res.locals.authenticatedUser)
      const appointment = await this.appointmentService.regenerateBarCode(appointmentId, userId)

      res.json(actionSucceed(appointmentUiDTOResponse(appointment, false)))
    } catch (error) {
      next(error)
    }
  }

  rescheduleAppointment = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {appointmentId} = req.params
      const {date, time} = req.body as {date: string; time: string}
      const appointmentFromDB:AppointmentDBModel=  await this.appointmentService.getAppointmentDBById(appointmentId);
      const acuityAppointmentId= appointmentFromDB.acuityAppointmentId;
      const isLabUser = getIsLabUser(res.locals.authenticatedUser)
      const canCancel = this.appointmentService.getCanCancel(isLabUser, appointmentFromDB.appointmentStatus)
      let result;
      console.log('Before can Cancel: ', canCancel);

      if(canCancel){
        //reschedule appointment for acuity
        const parsedTime= time.replace('am',' AM').replace('pm',' PM')
        const appointmentAcuityResponse :AppointmentAcuityResponse= await this.appointmentService.rescheduleAppointmentOnAcuity(acuityAppointmentId, (new Date(date+' '+parsedTime)).toISOString() )
        //reschedule appointment for acuity
        result = await this.appointmentService.rescheduleAppointment(
          appointmentId,
          date,
          time,
        )
        console.log('appointmentAcuityResponse: ', appointmentAcuityResponse, 'data changed. Parsed time');
      }
      
      res.json(actionSucceed(appointmentUiDTOResponse(result, false)))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminAppointmentController
