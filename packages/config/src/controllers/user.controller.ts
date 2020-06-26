import * as express from 'express'
import { Request, Response } from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import { request } from 'http'

import Validation from '../../../common/src/utils/validation'


class UserController implements IControllerBase 
{
    public path = ''
    public router = express.Router()
    
    constructor()
    {
        this.initRoutes()
    }

    public initRoutes() 
    {
        this.router.post(this.path + '/', this.config)
    }

    config = (req: Request, res: Response) => 
    {
        if (!Validation.validate(["registrationToken"], req, res))
        {
            return
        }
        
        const response = 
        {
            data : {
                updates : {
                    force: "1.0",
                    optional: "1.2",
                    iosUrl: "http://itunes.com/apps/opn",
                    androidUrl: "http://play.google.com/store/apps/details?id=com.opn.app"
                },
                services : {
                    registry : "https://registry.platform.stayopn.com",
                    attestation : "https://attestation.platform.stayopn.com",
                    access : "https://access.platform.stayopn.com",
                    lookup : "https://lookup.platform.stayopn.com",
                    enterprise : "https://enterprise.platform.stayopn.com"
                },
                badgeValidityPeriod : 60 * 60 * 24,
                badges:
                {
                    pending: "Pending",
                    caution: "Caution",
                    stop: "Stop",
                    proceed: "Proceed"
                }
            },
            status : "complete"
        }

        res.json(response);
    }
}

export default UserController