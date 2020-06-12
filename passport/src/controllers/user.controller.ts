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
        this.router.post(this.path + '/status/get', this.check)
        this.router.post(this.path + '/attestation/update', this.update)
    }

    check = (req: Request, res: Response) => 
    {
        if (!Validation.validate(["statusToken"], req, res))
        {
            return
        }

        const date = new Date()
        const response = 
        {
            data : {
                newStatusToken : uuid(),
                updatedBadge : "green",
                validFrom: date.toISOString(),
                validUntil : (new Date(date.getTime() + 60 * 60 * 24 * 1000)).toISOString()
            },
            serverTimestamp: date.toISOString(),
            status : "complete"
        }

        res.json(response);
    }

    update = (req: Request, res: Response) => 
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