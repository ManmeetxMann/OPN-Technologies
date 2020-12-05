import {NextFunction, Request, Response} from 'express'
import {body} from 'express-validator'
import {validator} from './basic.validator'

export default {
  packageValidation: (): ((req: Request, res: Response, next: NextFunction) => Promise<void>) =>
    validator([
      body('packageCode').isString().notEmpty().withMessage('must be not empty string'),
      body('organizationId').isString().notEmpty().withMessage('must be not empty string'),
    ]),
}
