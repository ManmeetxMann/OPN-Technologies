import * as express from 'express'
import { Request, Response } from 'express'
import IControllerBase from 'interfaces/IControllerBase.interface'


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
        const response = 
        {
            // data : {
            //     id : "987654321"
            // },
            status : "complete"
        }

        res.json(response);
    }
}

export default UserController