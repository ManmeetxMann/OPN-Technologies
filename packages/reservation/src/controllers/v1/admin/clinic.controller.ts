import {NextFunction, Request, Response, Router} from 'express'
import {ClinicPostRequest} from '../../../../../../packages/reservation/src/models/clinic'
import {ClinicService} from '../../../../../../packages/reservation/src/services/clinic.service'
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'

class AdminClinicController implements IControllerBase {
  public path = '/reservation/admin/api/v1'
  public router = Router()
  private clinicService = new ClinicService()

  constructor() {
    this.initRoutes()
  }

  initRoutes(): void {
    const opnAdmin = authorizationMiddleware([RequiredUserPermission.OPNAdmin])

    this.router.get(`${this.path}/clinics`, opnAdmin, this.getClinicsList)
    this.router.post(`${this.path}/clinics`, opnAdmin, this.createClinic)
  }

  getClinicsList = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const clinics = await this.clinicService.getAll()

      res.json(actionSucceed(clinics))
    } catch (error) {
      next(error)
    }
  }

  createClinic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const clinicBody = req.body as ClinicPostRequest
      const {id} = await this.clinicService.save(clinicBody)

      res.json(actionSucceed({id}))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminClinicController
