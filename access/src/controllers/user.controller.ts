import * as express from 'express'
import { Request, Response } from 'express'
import IControllerBase from 'interfaces/IControllerBase.interface'
import { request } from 'http'

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
            // data : {
            //     locations: []
            // },
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
            // data : {
            //     locations: []
            // },
            status : "complete"
        }

        res.json(response);
    }
}

export default UserController