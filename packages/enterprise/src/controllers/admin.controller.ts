import * as express from 'express'
import {NextFunction, Request, Response} from 'express'

import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'

import Validation from '../../../common/src/utils/validation'

import {AuthService} from '../../../common/src/service/auth/auth-service'
import {AuthLinkProcessRequest, AuthLinkRequestRequest} from '../models/auth-link-request'
import {actionFailed, actionSucceed} from '../../../common/src/utils/response-wrapper'
import {AdminApprovalService} from '../../../common/src/service/user/admin-service'
import {UnauthorizedException} from '../../../common/src/exceptions/unauthorized-exception'
import {UserService} from '../../../common/src/service/user/user-service'

// import { TokenService } from '../../../common/src/service/auth/token-service'

class AdminController implements IControllerBase {
  public path = '/admin'
  public router = express.Router()
  private authService = new AuthService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.post(this.path + '/auth/signIn/request', this.authSignInLinkRequest)
    this.router.post(this.path + '/auth/signIn/process', this.authSignInProcess)
    this.router.post(this.path + '/team/status', this.authMiddleware, this.teamStatus)
    this.router.post(this.path + '/team/review', this.authMiddleware, this.teamReview)
    this.router.post(this.path + '/billing/config', this.authMiddleware, this.billingConfig)
  }

  authSignInLinkRequest = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const authLinkRequest = req.body as AuthLinkRequestRequest
      const email = authLinkRequest.email.toLowerCase()

      // Check if we have approval for this admin
      const adminApprovalService = new AdminApprovalService()
      const approval = await adminApprovalService.findOneByEmail(email)
      if (!approval || approval.expired === true) {
        console.error(`Admin approval for ${email} does not exist`)
        throw new UnauthorizedException('Unauthorized Access')
      }

      // Create the user if not created
      await this.authService.createUser(email)

      // Send the email
      await this.authService.sendEmailSignInLink({email: email})

      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }

  authSignInProcess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {idToken, connectedId} = req.body as AuthLinkProcessRequest

      // Validate the token first and get the Auth user Id from it
      // FYI: AuthUserId is not a ConnectedUserId
      // (one is FB Auth User and other Firestore Custom User)
      const authService = new AuthService()
      const validatedAuthUser = await authService.verifyAuthToken(idToken)
      if (!validatedAuthUser?.email) {
        console.error('Invalid auth token provided')
        throw new UnauthorizedException('Unauthorized access')
      }

      // Check if auth user is connected to someone else
      const userService = new UserService()
      let connectedUser = await userService.findOneByAuthUserId(validatedAuthUser.uid)
      if (connectedUser?.id !== connectedId) {
        console.error('Auth token seems to already be connected')
        throw new UnauthorizedException('Unauthorized access')
      }

      // Check if the first time, if so let's:
      // Interconnect Auth + Connected User
      if (!connectedUser) {
        // Get the original admin approval:
        // So we can get the approval + expire
        const adminApprovalService = new AdminApprovalService()
        const approval = await adminApprovalService.findOneByEmail(validatedAuthUser.email)
        adminApprovalService.updateExpiry(approval.id, true)

        // Get connected user + Update
        connectedUser = await userService.findOneById(connectedId)
        if (!validatedAuthUser?.email) {
          console.error('ConnectedId is non-existent')
          throw new UnauthorizedException('Unauthorized access')
        }

        // Set the connection
        connectedUser.authUserId = validatedAuthUser.uid
        connectedUser.admin = approval.profile
        await userService.update(connectedUser)

        // Change the display name
        const name = [connectedUser.firstName, connectedUser.lastNameInitial].join(' ')
        authService.updateUser(validatedAuthUser.uid, {
          displayName: name,
        })

        // Commented below... as the claim would apply to the next login...
        // // Set the connectedId
        // await authService.setClaims(validatedAuthUser.uid, {
        //     connecteduserId: connectedUser.id,
        //     admin: true
        // })
        res.json(actionSucceed(approval.profile))
        return
      }

      res.json(actionFailed('No matching condition for processing the sign-in request'))
    } catch (error) {
      next(error)
    }
  }

  authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const bearerHeader = req.headers['authorization']
    if (!bearerHeader) {
      // Forbidden
      res.sendStatus(403)
      return
    }

    // Get the bearer
    const bearer = bearerHeader.split(' ')
    const idToken = bearer[1]

    // Validate
    const authService = new AuthService()
    const validatedAuthUser = await authService.verifyAuthToken(idToken)
    if (!validatedAuthUser) {
      // Forbidden
      res.sendStatus(403)
      return
    }

    // Grab our claim
    // TODO: using claims to get the id and then calling a get(...) instead of query
    //       would have been faster... but the claim won't propogate because they already
    //       had their claim... To be researched :-)
    const userService = new UserService()
    const connectedUser = await userService.findOneByAuthUserId(validatedAuthUser.uid)
    if (!connectedUser) {
      // Forbidden
      res.sendStatus(403)
      return
    }

    // Set it for the actual route
    res.locals.connectedUser = connectedUser

    // Done
    next()
  }

  teamStatus = (req: Request, res: Response): void => {
    // Test
    console.log(res.locals.connectedUser)

    const response = {
      data: {
        status: [
          {
            id: '987654321',
            firstName: 'Sean',
            lastNameInitial: 'S',
            badge: 'proceed',
          },
          {
            id: '987654321',
            firstName: 'Sean',
            lastNameInitial: 'S',
            badge: 'proceed',
          },
          {
            id: '987654321',
            firstName: 'Sean',
            lastNameInitial: 'S',
            badge: 'proceed',
          },
        ],
        attestationDue: [
          {
            id: '987654321',
            firstName: 'Sean',
            lastNameInitial: 'S',
          },
          {
            id: '987654321',
            firstName: 'Sean',
            lastNameInitial: 'S',
          },
          {
            id: '987654321',
            firstName: 'Sean',
            lastNameInitial: 'S',
          },
        ],
        serverTimestamp: new Date().toISOString(),
      },
      status: 'complete',
    }

    res.json(response)
  }

  teamReview = (req: Request, res: Response): void => {
    if (!Validation.validate(['connectedId', 'approval'], req, res, 'authRequestToken')) {
      return
    }

    const response = {
      // data : {
      //     authToken : "987654321234567890"
      // },
      serverTimestamp: new Date().toISOString(),
      status: 'complete',
    }

    res.json(response)
  }

  billingConfig = (req: Request, res: Response): void => {
    if (!Validation.validate([], req, res, 'authRequestToken')) {
      return
    }

    const response = {
      data: {
        billing: {
          enabled: true,
          statement: {
            numberOfUsers: 10,
            lastBillingDate: '765434567765434567',
            amountPaid: '$ 100.23 USD',
            nextBillingDate: '765434567765434567',
            amountDue: '$ 100.23 USD',
          },
        },
      },
      serverTimestamp: new Date().toISOString(),
      status: 'complete',
    }

    res.json(response)
  }
}

export default AdminController
