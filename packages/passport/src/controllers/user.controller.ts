import * as express from 'express'
import { Request, Response } from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import { request } from 'http'
import { v4 as uuid } from 'uuid';

import Validation from '../../../common/src/utils/validation'


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
        this.router.post(this.path + '/status/update', this.update)
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
                passport : {
                    updated: true,
                    statusToken : uuid(),
                    badge : "proceed",
                    validFrom: date.toISOString(),
                    validUntil : (new Date(date.getTime() + 60 * 60 * 24 * 1000)).toISOString()
                }
            },
            serverTimestamp: date.toISOString(),
            status : "complete"
        }

        res.json(response);
    }

    update = (req: Request, res: Response) => 
    {
        if (!Validation.validate(["locationId", "statusToken", "answer"], req, res))
        {
            return
        }

        console.log(req.body.locationId);
        console.log(req.body.answer);

        const date = new Date()
        const response = 
        {
            data : {
                attestationToken : uuid(),
                passport : {
                    updated: true,
                    statusToken : uuid(),
                    badge : "proceed",
                    validFrom: date.toISOString(),
                    validUntil : (new Date(date.getTime() + 60 * 60 * 24 * 1000)).toISOString()
                }
            },
            serverTimestamp: (new Date()).toISOString(),
            status : "complete"
        }

        res.json(response);
    }
}

export default UserController