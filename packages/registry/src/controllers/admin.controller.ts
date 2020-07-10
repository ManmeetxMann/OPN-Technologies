import * as express from 'express'
import {Request, Response} from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'

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

export default AdminController
