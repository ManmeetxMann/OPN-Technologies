import {body, check, validationResult} from 'express-validator'

export default {
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  validate: (validations) => {
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    return async (req, res, next) => {
      await Promise.all(validations.map((validation) => validation.run(req)))

      const errors = validationResult(req)
      if (errors.isEmpty()) {
        return next()
      }

      res.status(400).json({errors: errors.array()})
    }
  },
  csvValidation: () => {
    return [
      body('hexCt').isNumeric().withMessage('must be numeric'),
      body('hexCt')
        .custom((value) => {
          return parseInt(value) <= 40
        })
        .withMessage('must be less or equal than 40'),
      body('hexCt').isNumeric().withMessage('must be numeric'),
      body(['famCt', 'calRed61Ct', 'quasar670Ct', 'hexCt'])
        .custom((value) => {
          return value === 'N/A' || !isNaN(value)
        })
        .withMessage('must be numeric or N/A'),
    ]
  },

  csvBulkValidation: () => {
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
