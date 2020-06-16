import * as express from 'express'
import { Request, Response } from 'express'
import IControllerBase from 'interfaces/IControllerBase.interface'

import Validation from '../utils/validation'

class AdminController implements IControllerBase
{
    public path = '/admin'
    public router = express.Router()
    
    constructor()
    {
        this.initRoutes()
    }

    public initRoutes()
    {
        this.router.post(this.path + '/status/verify', this.check)
    }

    check = (req: Request, res: Response) => 
    {
        if (!Validation.validate(["attestationToken"], req, res))
        {
            return
        }

        const response = 
        {
            data : {
                badge : "green"
            },
            serverTimestamp: (new Date()).toISOString(),
            status : "complete"
        }

        res.json(response);
    }
}

export default AdminController