import {NextFunction, Request, Response, Router} from 'express'
import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {authorizationMiddleware} from '../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../common/src/types/authorization'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'

class ContentController implements IControllerBase {
  public path = '/config/api/v1'
  public router = Router()
  
  constructor(){
    this.initRoutes()
  }

  initRoutes(): void {
    this.router.get(
      this.path+ '/content/result',
      authorizationMiddleware([RequiredUserPermission.RegUser], true),
      this.getContractResults
    );
  }

  getContractResults= async (req: Request, res: Response, next: NextFunction): Promise<void> =>{
   const {lang, doctor} = req.query;
   console.log('lan: ', lang, 'doctor: ', doctor);
   const result={
    legalNotice: 'abc',
    doctorName: 'abc',
    doctorSignature: 'test',
    resultInfo:'test'
   }
   res.json(actionSucceed(result))
  }

}

export default ContentController