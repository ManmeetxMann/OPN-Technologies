import {NextFunction, Request, Response, Router} from 'express'

import {ClinicPostRequest} from '../../../models/clinic'
import {ClinicService} from '../../../services/clinic.service'

import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'
import {actionSucceed, actionSuccess} from '../../../../../common/src/utils/response-wrapper'

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
      const clinicsList = await this.clinicService.getAll()
      const clinics = clinicsList.map(({timestamps, ...fields}) => ({...fields}))

      res.json(actionSucceed(clinics))
    } catch (error) {
      next(error)
    }
  }

  createClinic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {name, address, acuityPass, acuityUser} = req.body as ClinicPostRequest
      const {id} = await this.clinicService.save({name, address, acuityPass, acuityUser})

      res.json(actionSuccess({id}, 'Clinic has been created'))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminClinicController
