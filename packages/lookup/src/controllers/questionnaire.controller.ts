import * as express from 'express'
import {NextFunction, Request, Response} from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../common/src/utils/response-wrapper'
import {QuestionnaireService} from '../services/questionnaire-service'
import {HttpException} from '../../../common/src/exceptions/httpexception'
import {Questionnaire} from '../models/questionnaire'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'

class QuestionnaireController implements IControllerBase {
  public router = express.Router()
  private questionnaireService = new QuestionnaireService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const childRouter = express
      .Router()
      .post('/', this.create)
      .get('/:questionnaireId', this.findOne)

    this.router.use('/questionnaires', childRouter)
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const questionnaire = await this.questionnaireService
        .create(req.body as Questionnaire)
        .catch((error) => {
          throw new HttpException(error.message)
        })
      res.json(actionSucceed(questionnaire))
    } catch (error) {
      next(error)
    }
  }

  findOne = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const questionnaireId = req.params['questionnaireId']
      const questionnaire = await this.questionnaireService.getQuestionnaire(questionnaireId)

      if (!questionnaire) {
        throw new ResourceNotFoundException(
          `Cannot find questionnaire with ID [${questionnaireId}]`,
        )
      }

      res.json(actionSucceed(questionnaire))
    } catch (error) {
      next(error)
    }
  }
}

export default QuestionnaireController
