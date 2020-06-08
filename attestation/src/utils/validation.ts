import { Request, Response } from 'express'

class Validation 
{
    public static errors = [];
    public static validate(vars: string[], req: Request, res: Response) : Boolean
    {
        // Wipe
        Validation.errors = [];

        // Compute
        var validates = true;
        for (var v of vars)
        {
            let validateVar = ((v in req.body) && (req.body[v] !== ""))
            if (validateVar === false)
            {
                Validation.errors.push(v)
            }

            validates = validates && validateVar
        }

        if (validates === false)
        {
            res.status(400).send(`Missing inputs: ${Validation.errors}`)
        }
        
        return validates
    }
}

export default Validation