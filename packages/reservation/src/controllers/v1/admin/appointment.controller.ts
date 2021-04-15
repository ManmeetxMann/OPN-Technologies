import {NextFunction, Request, Response, Router} from 'express'
import {fromPairs} from 'lodash'
//Common
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed, actionSuccess} from '../../../../../common/src/utils/response-wrapper'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'
import {BadRequestException} from '../../../../../common/src/exceptions/bad-request-exception'
import {ResourceNotFoundException} from '../../../../../common/src/exceptions/resource-not-found-exception'
import {isValidDate} from '../../../../../common/src/utils/times'
import {
  getIsClinicUser,
  getIsLabUser,
  getIsOpnSuperAdmin,
  getUserId,
} from '../../../../../common/src/utils/auth'
import {LogError} from '../../../../../common/src/utils/logging-setup'

//Services
import {AppoinmentService} from '../../../services/appoinment.service'
import {OrganizationService} from '../../../../../enterprise/src/services/organization-service'
import {TransportRunsService} from '../../../services/transport-runs.service'
import {PCRTestResultsService} from '../../../services/pcr-test-results.service'

//Model
import {
  appointmentByBarcodeUiDTOResponse,
  AppointmentByOrganizationRequest,
  AppointmentDBModel,
  statsUiDTOResponse,
  appointmentUiDTOResponse,
  UpdateTransPortRun,
  FilterName,
  FilterGroupKey,
} from '../../../models/appointment'
import {AppointmentBulkAction, BulkOperationResponse} from '../../../types/bulk-operation.type'
import {formatDateRFC822Local} from '../../../utils/datetime.helper'
import {appointmentTypeUiDTOResponse} from '../../../models/appointment-types'

class AdminAppointmentController implements IControllerBase {
  public path = '/reservation/admin'
  public router = Router()
  private appointmentService = new AppoinmentService()
  private organizationService = new OrganizationService()
  private transportRunsService = new TransportRunsService()
  private pcrTestResultsService = new PCRTestResultsService()

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
    const generateBarCodeAdminAuth = authorizationMiddleware([
      RequiredUserPermission.GenerateBarCodeAdmin,
    ])
    const lookupAdminAuth = authorizationMiddleware([RequiredUserPermission.LookupAdmin])
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
      lookupAdminAuth,
      this.getAppointmentByBarcode,
    )
    innerRouter.get(
      this.path + '/api/v1/appointments/barcode/get-new-code',
      generateBarCodeAdminAuth,
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
    innerRouter.get(
      this.path + '/api/v1/appointments/:appointmentId/history',
      apptLabOrOrgAdminAuth,
      this.getUserAppointmentHistoryByAppointmentId,
    )
    innerRouter.post(
      this.path + '/api/v1/appointments/copy',
      apptLabOrOrgAdminAuth,
      this.copyAppointment,
    )
    innerRouter.put(
      this.path + '/api/v1/appointments/:appointmentId/reschedule',
      apptLabOrOrgAdminAuth,
      this.rescheduleAppointment,
    )
    innerRouter.get(
      this.path + '/api/v1/appointments/acuity/types',
      apptLabOrOrgAdminAuth,
      this.getAcuityAppointmentTypeList,
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
        testType,
        labId: queryLab,
      } = req.query as AppointmentByOrganizationRequest

      const labId = (req.headers?.labid as string) || queryLab

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
      const isClinicUser = getIsClinicUser(res.locals.authenticatedUser)

      const appointments = await this.appointmentService.getAppointmentsDB({
        appointmentStatus,
        barCode,
        organizationId,
        dateOfAppointment,
        searchQuery,
        transportRunId,
        labId,
        testType,
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
              isClinicUser,
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
        testType,
      } = req.query as AppointmentByOrganizationRequest

      if (dateOfAppointment && !isValidDate(dateOfAppointment)) {
        throw new BadRequestException('dateOfAppointment is invalid')
      }

      const labId = req.headers?.labid as string

      const isClinicUser = getIsClinicUser(res.locals.authenticatedUser)

      const {
        appointmentStatusArray,
        orgIdArray,
        appointmentStatsByLabIdArr,
        total,
      } = await this.appointmentService.getAppointmentsStats({
        appointmentStatus,
        barCode,
        organizationId,
        dateOfAppointment,
        searchQuery,
        transportRunId,
        labId,
        testType,
      })

      const filterGroup = [
        {
          name: FilterName.FilterByStatusType,
          key: FilterGroupKey.appointmentStatus,
          filters: appointmentStatusArray,
        },
        {
          name: FilterName.FilterByCorporation,
          key: FilterGroupKey.organizationId,
          filters: orgIdArray,
        },
      ]

      if (isClinicUser) {
        filterGroup.push({
          name: FilterName.FilterByLab,
          key: FilterGroupKey.labId,
          filters: appointmentStatsByLabIdArr,
        })
      }

      res.json(actionSucceed(statsUiDTOResponse(filterGroup, total)))
    } catch (error) {
      next(error)
    }
  }

  getAppointmentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {appointmentId} = req.params as {appointmentId: string}
      const isLabUser = getIsLabUser(res.locals.authenticatedUser)
      const isOpnSuperAdmin = getIsOpnSuperAdmin(res.locals.authenticatedUser)
      const isClinicUser = getIsClinicUser(res.locals.authenticatedUser)

      const appointment = await this.appointmentService.getAppointmentDBByIdWithCancel(
        appointmentId,
        isOpnSuperAdmin,
      )
      if (!appointment) {
        throw new ResourceNotFoundException(`Appointment "${appointmentId}" not found`)
      }

      res.json(
        actionSucceed({
          ...appointmentUiDTOResponse(appointment, isLabUser, isClinicUser),
        }),
      )
    } catch (error) {
      next(error)
    }
  }

  cancelAppointment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = getUserId(res.locals.authenticatedUser)
      const isOpnSuperAdmin = getIsOpnSuperAdmin(res.locals.authenticatedUser)

      const {appointmentId} = req.params as {appointmentId: string}
      const {organizationId} = req.query as {organizationId: string}

      await this.appointmentService.cancelAppointment(
        appointmentId,
        adminId,
        isOpnSuperAdmin,
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

      // Get lab associated with transport run
      const [transportRun] = transportRuns
      const labId = transportRun?.labId

      const appointmentsState: BulkOperationResponse[] = await Promise.all(
        filtredAppointmentIds.map(async (appointmentId) => {
          const data = {
            transportRunId,
            userId: adminId,
          } as UpdateTransPortRun

          if (labId) {
            data.labId = labId
          }

          return this.appointmentService.makeBulkAction(
            appointmentId,
            data,
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
      const isClinicUser = getIsClinicUser(res.locals.authenticatedUser)

      const {appointmentId} = req.params as {
        appointmentId: string
      }

      const updatedAppointment = await this.appointmentService.makeCheckIn(appointmentId, adminId)

      res.json(actionSucceed(appointmentUiDTOResponse(updatedAppointment, isLabUser, isClinicUser)))
    } catch (error) {
      next(error)
    }
  }

  regenerateBarCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {appointmentId} = req.body as {appointmentId: string}
      const userId = getUserId(res.locals.authenticatedUser)
      const isClinicUser = getIsClinicUser(res.locals.authenticatedUser)
      const appointment = await this.appointmentService.regenerateBarCode(appointmentId, userId)

      res.json(actionSucceed(appointmentUiDTOResponse(appointment, false, isClinicUser)))
    } catch (error) {
      next(error)
    }
  }

  copyAppointment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {appointmentIds, date, organizationId} = req.body as {
        appointmentIds: string[]
        date: string
        organizationId?: string
      }
      const adminId = getUserId(res.locals.authenticatedUser)

      // Run copy operations in sequence
      const appointmentsState: BulkOperationResponse[] = await appointmentIds.reduce(
        // wait previous operation, make a copy then reduce into new array
        async (previousOperations: Promise<BulkOperationResponse[]>, appointmentId) => {
          const previousResults = await previousOperations

          const currentResult = await this.appointmentService.copyAppointment(
            appointmentId,
            date,
            adminId,
            organizationId,
          )

          return [...previousResults, currentResult]
        },
        Promise.resolve([]),
      )

      res.json(actionSuccess([...appointmentsState]))
    } catch (error) {
      next(error)
    }
  }

  getUserAppointmentHistoryByAppointmentId = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {appointmentId} = req.params as {appointmentId: string}
      const {organizationId} = req.query as {organizationId: string}
      const labId = req.headers?.labid as string
      const appointment = await this.appointmentService.getAppointmentDBById(appointmentId)
      if (organizationId && organizationId !== appointment.organizationId) {
        LogError(
          'AdminAppointmentController:getUserAppointmentHistoryByAppointmentId',
          'BadOrganizationId',
          {
            organizationId: appointment.organizationId,
            appointmentID: appointmentId,
          },
        )
        throw new BadRequestException('Request is not allowed')
      }
      if (labId && labId !== appointment.labId) {
        throw new BadRequestException('Request is not allowed')
      }
      const userAppointments = await this.appointmentService.getUserAppointments(
        appointment.userId,
        labId,
      )
      res.json(
        actionSucceed(
          userAppointments.map((userAppointment) => {
            const {id, dateTime, testType} = userAppointment
            return {id, dateTime: formatDateRFC822Local(dateTime), testType}
          }),
        ),
      )
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
      const userID = getUserId(res.locals.authenticatedUser)
      const isLabUser = getIsLabUser(res.locals.authenticatedUser)
      const isOpnSuperAdmin = getIsOpnSuperAdmin(res.locals.authenticatedUser)
      const isClinicUser = getIsClinicUser(res.locals.authenticatedUser)
      const {appointmentId} = req.params as {appointmentId: string}
      const {organizationId, dateTime} = req.body as {organizationId: string; dateTime: string}
      const updatedAppointment = await this.appointmentService.rescheduleAppointment({
        appointmentId,
        userID,
        isOpnSuperAdmin,
        organizationId,
        dateTime,
      })
      res.json(actionSucceed(appointmentUiDTOResponse(updatedAppointment, isLabUser, isClinicUser)))
    } catch (error) {
      next(error)
    }
  }

  getAcuityAppointmentTypeList = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const types = await this.appointmentService.getAcuityAppointmentTypes()
      res.json(
        actionSucceed(
          types.map((type) => ({
            ...appointmentTypeUiDTOResponse(type),
          })),
        ),
      )
    } catch (error) {
      next(error)
    }
  }
}

export default AdminAppointmentController
