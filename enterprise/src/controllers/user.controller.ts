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
        this.router.get(this.path + '/connect', this.connect)
        this.router.get(this.path + '/disconnect', this.disconnect)
    }

    connect = (req: Request, res: Response) => 
    {
        if (!Validation.validate(["key", "photo", "firstName", "lastNameInitial"], req, res))
        {
            return
        }

        console.log(req.body.key);
        console.log(req.body.photo);
        console.log(req.body.firstName);
        console.log(req.body.lastNameInitial);
        const response = 
        {
            data : {
                connectedId : "987654321"
            },
            status : "complete"
        }

        res.json(response);
    }

    disconnect = (req: Request, res: Response) => 
    {
        if (!Validation.validate(["key"], req, res))
        {
            return
        }

        console.log(req.body.key);
        const response = 
        {
            // data : {
                
            // },
            status : "complete"
        }

        res.json(response);
    }
}

export default UserController