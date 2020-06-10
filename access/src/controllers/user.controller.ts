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
        this.router.post(this.path + '/enter', this.enter)
        this.router.post(this.path + '/exit', this.exit)
        this.router.post(this.path + '/exposure/verify', this.exposureVerification)
    }

    enter = (req: Request, res: Response) => 
    {
        if (!Validation.validate(["locationId"], req, res))
        {
            return
        }

        console.log(req.body.accessToken);
        console.log(req.body.locationId);
        const response = 
        {
            data : {
                accessToken: uuid(),
                accessTimestamp: (new Date()).toISOString()
            },
            status : "complete"
        }

        res.json(response);
    }

    exit = (req: Request, res: Response) => 
    {
        if (!Validation.validate(["accessToken", "locationId"], req, res))
        {
            return
        }

        console.log(req.body.accessToken);
        const response = 
        {
            data : {
                accessTimestamp: (new Date()).toISOString()
            },
            status : "complete"
        }

        res.json(response);
    }

    exposureVerification = (req: Request, res: Response) => 
    {
        if (!Validation.validate(["accessToken", "locationId"], req, res))
        {
            return
        }

        console.log(req.body.accessToken);
        const response = 
        {
            data : {
                exposed: false
            },
            status : "complete"
        }

        res.json(response);
    }
}

export default UserController