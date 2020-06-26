import * as express from 'express'
import { Request, Response } from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'

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
        this.router.post(this.path + '/add', this.add)
        this.router.post(this.path + '/addNoPush', this.addNoPush)
    }

    add = (req: Request, res: Response) => 
    {
        if (!Validation.validate(["registrationToken"], req, res))
        {
            return
        }

        const response = 
        {
            status : "complete"
        }

        res.json(response);
    }

    addNoPush = (req: Request, res: Response) => 
    {
        const response = 
        {
            status : "complete"
        }

        res.json(response);
    }
}

export default UserController