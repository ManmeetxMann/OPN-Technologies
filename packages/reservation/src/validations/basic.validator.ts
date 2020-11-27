import {ValidationChain, validationResult} from 'express-validator'
import {NextFunction, Request, Response} from 'express'

export const validator = (validations: ValidationChain[]): ((req: Request, res: Response, next: NextFunction) => Promise<void>) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        await Promise.all(validations.map((validation) => validation.run(req)))

        const errors = validationResult(req)
        if (errors.isEmpty()) {
            return next()
        }

        res.status(400).json({errors: errors.array()})
    }
}

