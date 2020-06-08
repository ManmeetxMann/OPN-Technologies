import * as express from 'express'
import { Request, Response } from 'express'
import IControllerBase from 'interfaces/IControllerBase.interface'


class RootController implements IControllerBase 
{
    public path = '/'
    public router = express.Router()
    
    constructor() 
    {
        this.initRoutes()
    }

    public initRoutes() 
    {
        this.router.get('/root', this.index)
    }

    index = (req: Request, res: Response) => 
    {
        res.send("")
    }
}

export default RootController