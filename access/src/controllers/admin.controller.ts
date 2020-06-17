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
        this.router.post(this.path + '/stats', this.stats)
        this.router.post(this.path + '/enter', this.enter)
        this.router.post(this.path + '/exit', this.exit)
    }

    stats = (req: Request, res: Response) => 
    {
        if (!Validation.validate(["locationId"], req, res))
        {
            return
        }

        console.log(req.body.locationId);
        const response = 
        {
            data : {
                peopleOnPremises : 213,
                accessDenied: 8
            },
            serverTimestamp: (new Date()).toISOString(),
            status : "complete"
        }

        res.json(response);
    }

    enter = (req: Request, res: Response) => 
    {
        if (!Validation.validate(["accessToken", "locationId"], req, res))
        {
            return
        }

        console.log(req.body.accessToken);
        console.log(req.body.locationId);
        const response = 
        {
            data : {
                userStatusBadge: "proceed"
            },
            serverTimestamp: (new Date()).toISOString(),
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
            serverTimestamp: (new Date()).toISOString(),
            status : "complete"
        }

        res.json(response);
    }
}

export default AdminController