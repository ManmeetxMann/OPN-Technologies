import {body, check} from 'express-validator'
import {NextFunction, Request, Response} from 'express'

import {validator} from './basic.validator'

export default {
  csvValidation: (): ((req: Request, res: Response, next: NextFunction) => Promise<void>) => {
    return validator([
      body('hexCt')
        .custom((value) => {
          return parseInt(value) <= 40 || value === 'N/A'
        })
        .withMessage('must be less or equal than 40 or N/A'),
      body(['famCt', 'calRed61Ct', 'quasar670Ct', 'hexCt'])
        .custom((value) => {
          return value === 'N/A' || !isNaN(value)
        })
        .withMessage('must be numeric or N/A'),
      body('result')
        .isIn(['Positive', 'Negative', '2019-nCoV Detected'])
        .withMessage('must be one of: Positive, Negative, 2019-nCoV Detected'),
      body('resultDate').isDate().withMessage('must be valid date'),
    ])
  },

  csvBulkValidation: (): ((req: Request, res: Response, next: NextFunction) => Promise<void>) => {
    return validator([
      check('results.*.hexCt')
        .custom((value) => {
          return parseInt(value) <= 40 || value === 'N/A'
        })
        .withMessage('must be less or equal than 40'),
      body(['results.*.famCt', 'results.*.calRed61Ct', 'results.*.quasar670Ct', 'results.*.hexCt'])
        .custom((value) => {
          return value === 'N/A' || !isNaN(value)
        })
        .withMessage('must be numeric or N/A'),
      body('results.*.result')
        .isIn(['Positive', 'Negative', '2019-nCoV Detected', 'Inconclusive', 'Invalid'])
        .withMessage('must be one of: Positive, Negative, 2019-nCoV Detected'),
      body('resultDate').isDate().withMessage('must be valid date'),
    ])
  },
}
