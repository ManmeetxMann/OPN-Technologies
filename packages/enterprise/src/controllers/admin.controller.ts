import * as express from 'express'
import {NextFunction, Request, Response} from 'express'

import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'

import {AuthService} from '../../../common/src/service/auth/auth-service'
import {AuthLinkProcessRequest} from '../models/auth'
import {actionSucceed} from '../../../common/src/utils/response-wrapper'
import {AdminApprovalService} from '../../../common/src/service/user/admin-service'
import {UnauthorizedException} from '../../../common/src/exceptions/unauthorized-exception'
import {UserService} from '../../../common/src/service/user/user-service'
import {authorizationMiddleware} from '../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../common/src/types/authorization'
import {FirebaseManager} from '../../../common/src/utils/firebase'
import {LabService} from '../../../reservation/src/services/lab.service'

class AdminController implements IControllerBase {
  public path = '/admin'
  public router = express.Router()
  private authService = new AuthService()
  public labService = new LabService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.post(this.path + '/auth/signIn/request', this.authSignInLinkRequest)
    this.router.post(this.path + '/auth/signIn/process', this.authSignInProcess)
    this.router.get(
      this.path + '/self',
      authorizationMiddleware([RequiredUserPermission.OrgAdmin]),
      this.adminInfo,
    )
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
    // attach an admin approval to a user
    try {
      const {idToken, connectedId: userId} = req.body as AuthLinkProcessRequest

      // Validate the token first and get the Auth user Id from it
      // FYI: AuthUserId is not a ConnectedUserId
      // (one is FB Auth User and other Firestore Custom User)
      const authService = new AuthService()
      const userService = new UserService()

      const validatedAuthUser = await authService.verifyAuthToken(idToken)
      if (!validatedAuthUser?.email) {
        console.error('Invalid auth token provided')
        throw new UnauthorizedException('Unauthorized access')
      }
      const authUserId = validatedAuthUser.uid

      // Get the admin approval so we can grab their permissions
      const adminApprovalService = new AdminApprovalService()
      const approval = await adminApprovalService.findOneByEmail(validatedAuthUser.email)
      if (!approval) {
        console.error(`Admin approval for ${validatedAuthUser.email} does not exist`)
        throw new UnauthorizedException('Unauthorized access')
      }
      const userToConnect = await userService.findOneSilently(userId)
      if (!userToConnect) {
        console.error('Tried to connect to a non-existent user')
        throw new UnauthorizedException(`user ${userId} does not exist`)
      }
      if (userToConnect.email !== validatedAuthUser.email) {
        if (!validatedAuthUser?.email) {
          console.error('Connecting to a user with the wrong email')
          throw new UnauthorizedException('Unauthorized access')
        }
      }

      // Check if authUserId is in use
      // Must do these queries before saving the updated user
      const existingAdminUser = await userService.findOneByAdminAuthUserId(authUserId)
      const existingUser = await userService.findOneByAuthUserId(authUserId)

      userToConnect.admin = approval.profile
      userToConnect.authUserId = authUserId
      await userService.update(userToConnect)

      // disconnect this authUserId from other accounts
      if (existingUser && existingUser.id !== userId) {
        existingUser.authUserId = FirebaseManager.getInstance().getFirestoreDeleteField()
        await userService.update(existingUser)
        console.log(`authUserId ${authUserId} moved from ${existingUser.id} to ${userId}`)
      }
      // even if it is the same account we can remove admin.authUserId
      if (existingAdminUser) {
        existingAdminUser.authUserId = FirebaseManager.getInstance().getFirestoreDeleteField()
        await userService.update(existingAdminUser)
        console.log(`admin.authUserId ${authUserId} removed from ${existingAdminUser.id}`)
      }

      // Change the display name
      const name = `${userToConnect.firstName} ${userToConnect.lastName}`
      authService.updateUser(authUserId, {
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

  adminInfo = async (req: Request, res: Response): Promise<void> => {
    let {
      connectedUser: {admin},
    } = res.locals

    if (admin.adminForLabIds && admin.adminForLabIds.length > 0) {
      const labs = await this.labService.getAllByIds(admin.adminForLabIds)
      admin = {...admin, adminForLabIds: labs}
    }

    res.json(admin)
  }
}

export default AdminController
