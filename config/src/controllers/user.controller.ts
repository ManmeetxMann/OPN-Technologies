import * as express from 'express'
import { Request, Response } from 'express'
import IControllerBase from 'interfaces/IControllerBase.interface'
import { request } from 'http'

import Validation from '../utils/validation'


class UserController implements IControllerBase 
{
    public path = ''
    public router = express.Router()
    
    constructor()
    {
        this.initRoutes()
    }

    public initRoutes() 
    {
        this.router.post(this.path + '/', this.config)
    }

    config = (req: Request, res: Response) => 
    {
        if (!Validation.validate(["registrationToken"], req, res))
        {
            return
        }
        
        const response = 
        {
            data : {
                services : {
                    registry : "https://registry.platform.stayopn.com",
                    attestation : "https://attestation.platform.stayopn.com",
                    access : "https://access.platform.stayopn.com",
                    lookup : "https://lookup.platform.stayopn.com",
                    enterprise : "https://enterprise.platform.stayopn.com"
                } 
            },
            status : "complete"
        }

        res.json(response);
    }
}

export default UserController