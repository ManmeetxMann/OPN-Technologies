import {NextFunction, Request, Response, Router} from 'express'
import {flatten} from 'lodash'
import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'

import {adminAuthMiddleware} from '../../../../common/src/middlewares/admin.auth'
import {TestResultsService} from '../../services/test-results.service'
import {AppoinmentService} from '../../services/appoinment.service'
import {
  AppointmentByOrganizationRequest,
  AppointmentDTO,
  AppointmentUI,
} from '../../models/appoinment'
import {ResultTypes, testResultUiDTOResponse} from '../../models/test-result'

class AdminController implements IControllerBase {
  public path = '/reservation/admin'
  public router = Router()
  private testResultsService = new TestResultsService()
  private appointmentService = new AppoinmentService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    innerRouter.get(this.path + '/api/v1/test-results', adminAuthMiddleware, this.getListResult)

    this.router.use('/', innerRouter)
  }

  getListResult = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId, dateOfAppointment} = req.query as AppointmentByOrganizationRequest

      const appointments = await this.appointmentService.getAppointmentByOrganizationIdAndSearchParams(
        organizationId,
        dateOfAppointment,
      )

      const appointmentsUniqueById = [
        ...new Map(flatten(appointments).map((item) => [item.id, item])).values(),
      ]

      const responseAppointments = await Promise.all(
        appointmentsUniqueById.map(async (appointment: AppointmentDTO | AppointmentUI) => {
          const result = await this.testResultsService
            .getResults(appointment.barCode)
            .then(({result}) => result)
            .catch(() => ResultTypes.Pending)

          return {
            ...testResultUiDTOResponse(appointment),
            result,
          }
        }),
      )

      res.json(actionSucceed(responseAppointments))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminController
