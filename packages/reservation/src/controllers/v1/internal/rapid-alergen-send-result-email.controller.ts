import {NextFunction, Request, Response, Router} from 'express'
//Common
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'

//Services
import {RapidAntigenTestResultsService} from '../../../services/rapid-antigen-test-results.service'

class InternalRapidAntigenResultEmailSendController implements IControllerBase {
  public path = '/reservation/internal'
  public router = Router()
  private rapidAntigenTestResultsService = new RapidAntigenTestResultsService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    //TODO: Add PubSUb Validate
    innerRouter.post(
      this.path + '/api/v1/rapid-alergen-send-result-email',
      this.sendTestResultEmail,
    )

    this.router.use('/', innerRouter)
  }

  sendTestResultEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {appointmentID} = req.body
      await this.rapidAntigenTestResultsService.sendTestResultEmail(appointmentID)
      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }
}

export default InternalRapidAntigenResultEmailSendController
