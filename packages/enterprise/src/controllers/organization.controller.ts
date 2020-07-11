import * as express from 'express'
import {NextFunction, Request, Response} from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../common/src/utils/response-wrapper'
import {Organization, OrganizationLocation} from '../models/organization'
import {OrganizationService} from '../services/organization-service'
import {HttpException} from '../../../common/src/exceptions/httpexception'

const BASE_PATH = '/organizations'
class OrganizationController implements IControllerBase {
  public router = express.Router()
  private organizationService = new OrganizationService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes() {
    this.router.post(BASE_PATH, this.create)
    this.router.post(`${BASE_PATH}/:organizationId/locations`, this.addLocations)
    this.router.get(`${BASE_PATH}/:organizationId/locations`, this.getLocations)
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organization = await this.organizationService
        .create(req.body as Organization)
        .catch((error) => {
          throw new HttpException(error.message)
        })
      res.json(actionSucceed(organization))
    } catch (error) {
      next(error)
    }
  }

  addLocations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.params['organizationId']
      const locations = await this.organizationService
        .addLocations(organizationId, req.body as OrganizationLocation[])
        .catch((error) => {
          throw new HttpException(error.message)
        })
      res.json(actionSucceed(locations))
    } catch (error) {
      next(error)
    }
  }

  getLocations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.params['organizationId']
      const locations = await this.organizationService.getLocations(organizationId)

      res.json(actionSucceed(locations))
    } catch (error) {
      next(error)
    }
  }
}

export default OrganizationController
