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
        // this.router.get(this.path + '/check', this.check)
    }
}

export default AdminController