import * as express from 'express'
import { Request, Response, NextFunction } from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'

import Validation from '../../../common/src/utils/validation'

import { AuthService } from '../../../common/src/service/auth/auth-service'
import { AuthLinkRequestRequest, AuthLinkProcessRequest } from '../models/auth-link-request'
import { actionSucceed } from '../../../common/src/utils/response-wrapper'
import { AdminApprovalService } from '../../../common/src/service/user/admin-service'
import { UnauthorizedException } from '../../../common/src/exceptions/unauthorized-exception'
import { UserService } from '../../../common/src/service/user/user-service'

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

    authSignInLinkRequest = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {
                email
            } = req.body as AuthLinkRequestRequest

            // Check if we have approval for this admin
            const adminApprovalService = new AdminApprovalService()
            const approval = await adminApprovalService.findOneByEmail(email)
            if (approval === null || approval.expired === true)
            {
                throw new UnauthorizedException("Invalid Operation")
            }

            // Create the user if not created
            const userCreated = await this.authService.createUser(email)

            // Send the email
            const link = await this.authService.sendEmailSignInLink({email: email})
            
            res.json(actionSucceed());
        } 
        catch (error) {
            next(error)
        }
    }

    authSignIn = async (req: Request, res: Response, next: NextFunction) => 
    {
        try {
            const {
                authToken,
                connectedId
            } = req.body as AuthLinkProcessRequest

            // Validate the token first and get the Auth user Id from it
            // FYI: AuthUserId != connectedUserId
            // (one is FB Auth User and other Firestore Custom User)
            const authService = new AuthService()
            const validatedAuthUser = await authService.verifyAuthToken(authToken)
            if (validatedAuthUser === null || validatedAuthUser.email === null) {
                throw new UnauthorizedException("Invalid Operation")
            }

            // Check if auth user is connected to someone else
            const userService = new UserService()
            var connectedUser = await userService.findOneByAuthUserId(validatedAuthUser.uid)
            if (connectedUser !== null && connectedUser.id !== connectedId) {
                throw new UnauthorizedException("Invalid Operation")
            }
            
            // Check if the first time -> Let's connect Auth + Connected User
            if (connectedUser === null) {
                // Get the admin's email, so we can get the approval + expire
                const email = validatedAuthUser.email! //await authService.getUserEmail(validatedAuthUser.uid)
                const adminApprovalService = new AdminApprovalService()
                const approval = await adminApprovalService.findOneByEmail(email)
                adminApprovalService.updateExpiry(approval.id, true)

                // Get connected user + Update
                connectedUser = await userService.findOneById(connectedId)

                // Set the connection
                connectedUser.authUserId = validatedAuthUser.uid
                connectedUser.admin = approval.profile
                await userService.update(connectedUser)

                // Change the display name
                const name = [connectedUser.firstName, connectedUser.lastNameInitial].join(" ")
                authService.updateUser(validatedAuthUser.uid, {displayName: name})
            }

            res.json(actionSucceed());
        } 
        catch (error) {
            next(error)
        }
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