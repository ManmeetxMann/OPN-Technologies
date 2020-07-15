import * as express from 'express'
import { Request, Response } from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'

import Validation from '../../../common/src/utils/validation'

import { AuthService } from '../../../common/src/service/auth/auth-service'
import {AuthLinkRequest} from '../models/auth-link-request'

class AdminController implements IControllerBase
{
    public path = '/admin'
    public router = express.Router()
    private authService = new AuthService()
    
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
        this.router.post(this.path + '/billing/config', this.billingConfig)
    }

    authSignInLinkRequest = async (req: Request, res: Response) => 
    {
        const {
            email,
            connectedId
        } = req.body as AuthLinkRequest
        
        // Create the user if not created
        const userCreated = await this.authService.createUser(email)

        // Send the email
        const link = await this.authService.sendEmailSignInLink(email)


        const response = 
        {
            status : "succeeded"
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
                serverTimestamp: (new Date()).toISOString(),
            },
            status : "complete"
        }

        res.json(response)
    }

    teamReview = (req: Request, res: Response) => 
    {
        if (!Validation.validate(["connectedId", "approval"], req, res, "authRequestToken"))
        {
            return
        }

        const response = 
        {
            // data : {
            //     authToken : "987654321234567890"
            // },
            serverTimestamp: (new Date()).toISOString(),
            status : "complete"
        }

        res.json(response);
    }

    billingConfig = (req: Request, res: Response) => 
    {
        if (!Validation.validate([], req, res, "authRequestToken"))
        {
            return
        }

        const response = 
        {
            data : {
                billing: {
                    enabled: true,
                    statement: {
                        numberOfUsers : 10,
                        lastBillingDate : "765434567765434567",
                        amountPaid : "$ 100.23 USD",
                        nextBillingDate : "765434567765434567",
                        amountDue : "$ 100.23 USD"
                    }
                }
            },
            serverTimestamp: (new Date()).toISOString(),
            status : "complete"
        }

        res.json(response);
    }
}

export default AdminController