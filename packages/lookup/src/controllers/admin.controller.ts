import * as express from 'express'
import { Request, Response } from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'

import Validation from '../../../common/src/utils/validation'

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