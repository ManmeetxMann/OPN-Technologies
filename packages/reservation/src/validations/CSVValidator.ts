import {validationResult} from 'express-validator'

export default {
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  validateCSVSubmit: (validations) => {
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
}
