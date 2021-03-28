import {NextFunction, Request, Response, Router} from 'express'
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {AppointmentToTestTypeAssocPostRequest} from '../../../models/appointment-test-association'
import {AppointmentToTestTypeAssocService} from '../../../services/appointment-to-test-type-association.service'

class AppointmentToTestTypeAssociationController implements IControllerBase {
  public router = Router()
  public path = '/reservation/admin/api/v1'
  private appointmentToTestTypeAssocService = new AppointmentToTestTypeAssocService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const opnAdmin = authorizationMiddleware([RequiredUserPermission.OPNAdmin])

    this.router.post(`${this.path}/appointment-type-to-test-type-assoc`, opnAdmin, this.associate)
    this.router.get(
      `${this.path}/appointment-type-to-test-type-assoc`,
      opnAdmin,
      this.getAssociationList,
    )
  }

  /**
   * Associates appointment type to test type
   */
  associate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {appointmentType, testType} = req.body as AppointmentToTestTypeAssocPostRequest
      const {id} = await this.appointmentToTestTypeAssocService.save({appointmentType, testType})

      res.json(actionSucceed({id}))
    } catch (error) {
      next(error)
    }
  }

  getAssociationList = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const associations = await this.appointmentToTestTypeAssocService.getAll()

      res.json(actionSucceed(associations))
    } catch (error) {
      next(error)
    }
  }
}

export default AppointmentToTestTypeAssociationController
