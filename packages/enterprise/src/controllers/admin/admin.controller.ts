import * as express from 'express'
import {NextFunction, Request, Response} from 'express'

import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'

import Validation from '../../../../common/src/utils/validation'

import {AuthService} from '../../../../common/src/service/auth/auth-service'
import {AuthLinkProcessRequest} from '../../models/auth-link-request'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {AdminApprovalService} from '../../../../common/src/service/user/admin-service'
import {UnauthorizedException} from '../../../../common/src/exceptions/unauthorized-exception'
import {UserService} from '../../../../common/src/service/user/user-service'
import {authMiddleware} from '../../../../common/src/middlewares/auth'
import {FirebaseManager} from '../../../../common/src/utils/firebase'
import {now} from '../../../../common/src/utils/times'

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
    this.router.post(this.path + '/team/status', authMiddleware, this.teamStatus)
    this.router.post(this.path + '/team/review', authMiddleware, this.teamReview)
    this.router.post(this.path + '/billing/config', authMiddleware, this.billingConfig)
    this.router.get(this.path + '/self', authMiddleware, this.adminInfo)
  }

  authSignInLinkRequest = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const email = req.body.email.toLowerCase()

      // Check if we have approval for this admin
      const adminApprovalService = new AdminApprovalService()
      const approval = await adminApprovalService.findOneByEmail(email)
      if (!approval) {
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

      // Get the admin approval so we can grab their permissions
      const adminApprovalService = new AdminApprovalService()
      const approval = await adminApprovalService.findOneByEmail(validatedAuthUser.email)
      if (!approval) {
        console.error(`Admin approval for ${validatedAuthUser.email} does not exist`)
        throw new UnauthorizedException('Unauthorized access')
      }

      // Check if auth user is connected to someone else
      const userService = new UserService()
      let connectedUser = await userService.findOneByAuthUserId(validatedAuthUser.uid)

      // If so let's remove if off of them
      if (!!connectedUser && connectedUser?.id !== connectedId) {
        await userService.updateProperties(connectedUser.id, {
          authUserId: FirebaseManager.getInstance().getFirestoreDeleteField(),
          admin: FirebaseManager.getInstance().getFirestoreDeleteField(),
        })
      }

      // Get the proper connected user then
      if (!connectedUser || connectedUser?.id !== connectedId) {
        connectedUser = await userService.findOneSilently(connectedId)
        if (!validatedAuthUser?.email) {
          console.error('ConnectedId is non-existent')
          throw new UnauthorizedException('Unauthorized access')
        }
      }

      // Set the connection
      connectedUser.authUserId = validatedAuthUser.uid
      connectedUser.admin = approval.profile
      await userService.update(connectedUser)

      // Change the display name
      const name = [connectedUser.firstName, connectedUser.lastName].join(' ')
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
    } catch (error) {
      next(error)
    }
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
            lastName: 'S',
            badge: 'proceed',
          },
          {
            id: '987654321',
            firstName: 'Sean',
            lastName: 'S',
            badge: 'proceed',
          },
          {
            id: '987654321',
            firstName: 'Sean',
            lastName: 'S',
            badge: 'proceed',
          },
        ],
        attestationDue: [
          {
            id: '987654321',
            firstName: 'Sean',
            lastName: 'S',
          },
          {
            id: '987654321',
            firstName: 'Sean',
            lastName: 'S',
          },
          {
            id: '987654321',
            firstName: 'Sean',
            lastName: 'S',
          },
        ],
        serverTimestamp: now().toISOString(),
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
      serverTimestamp: now().toISOString(),
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
      serverTimestamp: now().toISOString(),
      status: 'complete',
    }

    res.json(response)
  }

  adminInfo = async (req: Request, res: Response): Promise<void> => {
    const {connectedUser} = res.locals
    res.json(connectedUser.admin)
  }
}

export default AdminController
