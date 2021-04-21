import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {Config} from '../../../../../common/src/utils/config'
import * as express from 'express'
import {UserService} from '../../../../../common/src/service/user/user-service'
import {NextFunction, Request, Response} from 'express'
import {WebhookUserCreateRequest} from '../../../models/user'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {OrganizationService} from '../../../services/organization-service'
import {AuthService} from '../../../../../common/src/service/auth/auth-service'
import {UserAddressService} from '../../../services/user-address-service'
import {UserSyncService} from '../../../services/user-sync-service'

class UserController implements IControllerBase {
  public path = '/enterprise/internal/api/v1/user'
  public router = express.Router()
  private userService = new UserService()
  private userSyncService = new UserSyncService()
  private organizationService = new OrganizationService()
  private authService = new AuthService()
  private userAddressService = new UserAddressService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.post(this.path + '/', this.findOrCreateUser)
  }

  findOrCreateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        email,
        firstName,
        lastName,
        organizationId,
        address,
        dateOfBirth,
        agreeToConductFHHealthAssessment,
        shareTestResultWithEmployer,
        readTermsAndConditions,
        receiveResultsViaEmail,
        receiveNotificationsFromGov,
      } = req.body as WebhookUserCreateRequest

      const publicOrgId = Config.get('PUBLIC_ORG_ID')
      const publicGroupId = Config.get('PUBLIC_GROUP_ID')

      // user inside users collection
      let user = await this.userService.findOneByEmail(email)

      // user in Firebase users
      const firebaseUser = await this.authService.getUserByEmail(email)

      // create user only if: user doesn't exists in collection and firebase
      // and user is associated with organization
      if (!user && !firebaseUser && organizationId) {
        const firebaseUserId = await this.authService.createUser(email)

        user = await this.userService.create({
          firstName,
          lastName,
          email,
          dateOfBirth,
          admin: null,
          authUserId: firebaseUserId,
          base64Photo: Config.get('DEFAULT_USER_PHOTO') || '',
          registrationId: null,
          delegates: [],
          organizationIds: [publicOrgId, organizationId],
          agreeToConductFHHealthAssessment,
          shareTestResultWithEmployer,
          readTermsAndConditions,
          receiveResultsViaEmail,
          receiveNotificationsFromGov,
        })

        await this.userSyncService.create(
          {
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: '',
            photoUrl: user.base64Photo ?? null,
            firebaseKey: user.id,
            patientPublicId: '',
            registrationId: user.registrationId || '', // @TODO Remove this field after merging PR related to this field
            dateOfBirth: '',
          },
          {
            authUserId: user.authUserId as string,
            email: user.email,
          },
        )

        // add user in public group
        await this.organizationService.addUserToGroup(publicOrgId, publicGroupId, user.id)

        await this.userAddressService.create({userId: user.id, address})
      }

      res.json(actionSucceed(user))
    } catch (error) {
      next(error)
    }
  }
}

export default UserController
