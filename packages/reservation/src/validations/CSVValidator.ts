import {body, check, ValidationChain, validationResult} from 'express-validator'
import {NextFunction, Request, Response} from 'express'

export default {
  validate: (
    validations: ValidationChain[],
  ): ((req: Request, res: Response, next: NextFunction) => Promise<void>) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      await Promise.all(validations.map((validation) => validation.run(req)))

      const errors = validationResult(req)
      if (errors.isEmpty()) {
        return next()
      }

      res.status(400).json({errors: errors.array()})
    }
  },
  csvValidation: (): ValidationChain[] => {
    return [
      body('hexCt')
        .custom((value) => {
          return parseInt(value) <= 40 || value === 'N/A'
        })
        .withMessage('HEX C(t) must be less or equal than 40'),
      body(['famCt', 'calRed61Ct', 'quasar670Ct', 'hexCt'])
        .custom((value) => {
          return value === 'N/A' || !isNaN(value)
        })
        .withMessage('must be numeric or N/A'),
    ]
  },

  csvBulkValidation: (): ValidationChain[] => {
    return [
      check('results.*.hexCt')
        .custom((value) => {
          return parseInt(value) <= 40
        })
        .withMessage('must be less or equal than 40'),
      body(['results.*.famCt', 'results.*.calRed61Ct', 'results.*.quasar670Ct', 'results.*.hexCt'])
        .custom((value) => {
          return value === 'N/A' || !isNaN(value)
        })
        .withMessage('must be numeric or N/A'),
      body('results.*.result').isIn(['Positive', 'Negative']).withMessage('invalid csv rows'),
    ]
  },
}
