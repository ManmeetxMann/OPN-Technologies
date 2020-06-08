import { Request, Response } from 'express'

class Validation 
{
    public static errors = [];
    public static validate(vars: string[], req: Request, res: Response, authHeader: string | null = null) : Boolean
    {
        // Wipe
        Validation.errors = [];

        // Compute
        var validates = true;
        var authError = false;

        // First check for auth header
        if (authHeader !== null)
        {
            // console.log("HELLO!?")
            // console.log(req.headers)

            // By default
            validates = false;
            authError = true;
            
            // Now check
            var headerName = "authorization";
            if (req.headers && req.headers[headerName]) 
            {
                let partsString = req.headers[headerName] as string
                var parts = partsString.split(' ');
                if (parts.length === 2 && parts[0] === "Bearer") 
                {
                    let token = parts[1]
                    console.log(token)
    
                    validates = true;
                    authError = false;
                }
            }
        }
        
        // Check through the inputs
        console.log(vars)
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
            if (authError)
            {
                res.status(400).send(`Auth error`)
            }
            else
            {
                res.status(400).send(`Missing inputs: ${Validation.errors}`)
            }
        }
        
        return validates
    }
}

export default Validation