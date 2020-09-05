import * as express from 'express'
import {NextFunction, Request, Response} from 'express'
import IRouteController from '../../../common/src/interfaces/IRouteController.interface'
import {PassportService} from '../../../passport/src/services/passport-service'
import {OrganizationService} from '../../../enterprise/src/services/organization-service'
import {AccessService} from '../service/access.service'
import {actionFailed, actionSucceed} from '../../../common/src/utils/response-wrapper'
import {PassportStatuses} from '../../../passport/src/models/passport'
import {isPassed} from '../../../common/src/utils/datetime-util'
import {UserService} from '../../../common/src/service/user/user-service'
import {User} from '../../../common/src/data/user'
import {AdminProfile} from '../../../common/src/data/admin'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {UnauthorizedException} from '../../../common/src/exceptions/unauthorized-exception'
import {authMiddleware} from '../../../common/src/middlewares/auth'
import moment from 'moment'
import * as _ from 'lodash'

class AdminController implements IRouteController {
  public router = express.Router()
  private passportService = new PassportService()
  private accessService = new AccessService()
  private userService = new UserService()
  private organizationService = new OrganizationService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const routes = express
      .Router()
      .post('/stats', authMiddleware, this.stats)
      .post('/enter', authMiddleware, this.enter)
      .post('/exit', authMiddleware, this.exit)
    this.router.use('/admin', routes)
  }

  stats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {locationId: locationIdOrPath} = req.body
      // handle (temporarily) `organizations/{orgId}/locations/{locationId}` as the `locationId`
      const paths = locationIdOrPath.split('/')
      const locationId = paths.length > 0 ? paths[paths.length - 1] : locationIdOrPath

      //TODO: Assert admin can access that location
      const asOfDateTime = new Date().toISOString()
      const stats = await this.accessService.getTodayStatsForLocation(locationId)
      const checkInsPerHour = fakeCheckInsPerHour()
      const responseBody = {..._.omit(stats, ['id', 'createdAt']), asOfDateTime, checkInsPerHour}

      res.json(actionSucceed(responseBody))
    } catch (error) {
      next(error)
    }
  }

  enter = async (req: Request, res: Response, next: NextFunction): Promise<unknown> => {
    try {
      const {accessToken, userId} = req.body
      const access = await this.accessService.findOneByToken(accessToken)
      const passport = await this.passportService.findOneByToken(access.statusToken)
      const user = await this.userService.findOne(userId)

      const {organizationId, ...location} = await this.organizationService.getLocationById(
        access.locationId,
      )

      if (!location.allowAccess) {
        throw new BadRequestException('Location does not permit direct check-in')
      }
      if (userId !== access.userId) {
        // TODO: we could remove userId from this request
        throw new UnauthorizedException(`Access ${accessToken} does not belong to ${userId}`)
      }

      const authenticatedUser = res.locals.connectedUser as User
      const adminForLocations = (authenticatedUser.admin as AdminProfile).adminForLocationIds
      const adminForOrganization = (authenticatedUser.admin as AdminProfile).adminForOrganizationId
      if (adminForOrganization !== organizationId) {
        throw new UnauthorizedException(`Not an admin for organization ${organizationId}`)
      }

      if (
        !(
          adminForLocations.includes(location.id) ||
          (location.parentLocationId && adminForLocations.includes(location.parentLocationId))
        )
      ) {
        throw new UnauthorizedException(`Not an admin for location ${location.id}`)
      }

      const responseBody = {
        passport,
        base64Photo: user.base64Photo,
        dependants: [],
        includesGuardian: access.includesGuardian,
        firstName: user.firstName,
        lastName: user.lastName,
      }
      const canEnter =
        passport.status === PassportStatuses.Pending ||
        (passport.status === PassportStatuses.Proceed && !isPassed(passport.validUntil))

      if (canEnter) {
        const {dependants} = await this.accessService.handleEnter(access)
        return res.json(actionSucceed({...responseBody, dependants}))
      }

      res.status(400).json(actionFailed('Access denied for access-token', responseBody))
    } catch (error) {
      next(error)
    }
  }

  exit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {accessToken, userId} = req.body
      const access = await this.accessService.findOneByToken(accessToken)
      const includesGuardian = access.includesGuardian
      // if unspecified, all remaining dependents

      const passport = await this.passportService.findOneByToken(access.statusToken)
      const user = await this.userService.findOne(userId)
      if (userId !== access.userId) {
        throw new UnauthorizedException(`Access ${accessToken} does not belong to ${userId}`)
      }
      const {dependants} = await this.accessService.handleExit(access)

      const responseBody = {
        passport,
        base64Photo: user.base64Photo,
        dependants,
        includesGuardian,
        firstName: user.firstName,
        lastName: user.lastName,
      }
      res.json(actionSucceed(responseBody))
    } catch (error) {
      next(error)
    }
  }
}
const nowPlusHour = (amount = 1) => moment().startOf('day').add(amount, 'hours')

const fakeCheckInsPerHour = () => [
  {date: nowPlusHour(7), count: 0},
  {date: nowPlusHour(8), count: 5},
  {date: nowPlusHour(9), count: 50},
  {date: nowPlusHour(10), count: 200},
  {date: nowPlusHour(11), count: 212},
  {date: nowPlusHour(12), count: 190},
  {date: nowPlusHour(13), count: 110},
]

export default AdminController
