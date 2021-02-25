import {NextFunction, Request, Response, Router} from 'express'
import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {authorizationMiddleware} from '../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../common/src/types/authorization'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {
  Content,
  ResultContentRequest,
  ResultContentResponse,
  ResultInfo,
} from '../../models/content'
import {Doctor} from '../../models/doctor'
import {ContentService} from '../../services/content.service'

class ContentController implements IControllerBase {
  public path = '/config/api/v1'
  public router = Router()
  private contentService = new ContentService()
  constructor() {
    this.initRoutes()
  }

  initRoutes(): void {
    this.router.get(
      this.path + '/content/result',
      authorizationMiddleware([RequiredUserPermission.RegUser], true),
      this.getContentResults,
    )
  }

  getContentResults = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {lang, doctor} = req.query as ResultContentRequest
      const professional: Doctor = this.contentService.getDoctorById(doctor)
      const contentList: Content[] = await this.contentService.getContentListByLang(lang)
      let result: ResultContentResponse
      if (professional && contentList.length > 0) {
        const resultInfo: ResultInfo[] = contentList.map((content: Content) => {
          const {details, resultType} = content
          return {details, resultType}
        })

        result = {
          legalNotice: '',
          doctorName: professional.name,
          doctorSignature: professional.signatureUrl,
          resultInfo,
        }
      }
      res.json(actionSucceed(result))
    } catch (error) {
      next(error)
    }
  }
}

export default ContentController
