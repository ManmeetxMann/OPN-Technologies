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
        this.router.post(this.path + '/auth/signIn/request', this.authSignInLinkRequest)
        this.router.post(this.path + '/auth/signIn/process', this.authSignIn)
        this.router.post(this.path + '/team/status', this.teamStatus)
        this.router.post(this.path + '/team/review', this.teamReview)
        this.router.post(this.path + '/billing/stats', this.billingStats)
    }

    authSignInLinkRequest = (req: Request, res: Response) => 
    {
        if (!Validation.validate(["email"], req, res))
        {
            return
        }

        const response = 
        {
            data : {
                magicLink : "https://app.platform.stayopn.com/admin/auth/987654321234567890",
                authRequestToken : "987654321234567890"
            },
            status : "complete"
        }

        res.json(response);
    }

    authSignIn = (req: Request, res: Response) => 
    {
        if (!Validation.validate(["authRequestToken"], req, res))
        {
            return
        }

        const response = 
        {
            data : {
                authToken : "987654321234567890"
            },
            status : "complete"
        }

        res.json(response);
    }

    teamStatus = (req: Request, res: Response) => 
    {
        if (!Validation.validate([], req, res, "authToken"))
        {
            return
        }

        const response = 
        {
            data : {
                status : [
                    {
                        id : "987654321",
                        firstName : "Sean",
                        lastNameInitial : "S",
                        badge: "proceed"
                    },
                    {
                        id : "987654321",
                        firstName : "Sean",
                        lastNameInitial : "S",
                        badge: "proceed"
                    },
                    {
                        id : "987654321",
                        firstName : "Sean",
                        lastNameInitial : "S",
                        badge: "proceed"
                    }
                ],
                attestationDue : [
                    {
                        id : "987654321",
                        firstName : "Sean",
                        lastNameInitial : "S"
                    },
                    {
                        id : "987654321",
                        firstName : "Sean",
                        lastNameInitial : "S"
                    },
                    {
                        id : "987654321",
                        firstName : "Sean",
                        lastNameInitial : "S"
                    }
                ],
                serverTimestamp : "2345678987654"
            },
            status : "complete"
        }

        res.json(response)
    }

    teamReview = (req: Request, res: Response) => 
    {
        if (!Validation.validate(["conectedId", "approval"], req, res, "authRequestToken"))
        {
            return
        }

        const response = 
        {
            // data : {
            //     authToken : "987654321234567890"
            // },
            status : "complete"
        }

        res.json(response);
    }

    billingStats = (req: Request, res: Response) => 
    {
        if (!Validation.validate([], req, res, "authRequestToken"))
        {
            return
        }

        const response = 
        {
            data : {
                numberOfUsers : 10,
                lastBillingDate : "765434567765434567",
                amountPaid : "$ 100.23 USD",
                nextBillingDate : "765434567765434567",
                amountDue : "$ 100.23 USD"
            },
            status : "complete"
        }

        res.json(response);
    }
}

export default AdminController