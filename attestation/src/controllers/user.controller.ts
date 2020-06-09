import * as express from 'express'
import { Request, Response } from 'express'
import IControllerBase from 'interfaces/IControllerBase.interface'
import { request } from 'http'
import { v4 as uuid } from 'uuid';

import Validation from '../utils/validation'


class UserController implements IControllerBase 
{
    public path = '/user'
    public router = express.Router()
    
    constructor()
    {
        this.initRoutes()
    }

    public initRoutes() 
    {
        this.router.post(this.path + '/add', this.add)
    }

    add = (req: Request, res: Response) => 
    {
        if (!Validation.validate(["attestationId", "answer"], req, res))
        {
            return
        }

        console.log(req.body.attestationId);
        console.log(req.body.answer);
        const response = 
        {
            data : {
                attestationToken : uuid(),
                updatedBadge : "green"
            },
            status : "complete"
        }

        res.json(response);
    }
}

export default UserController