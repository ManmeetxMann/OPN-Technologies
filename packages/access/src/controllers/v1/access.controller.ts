import * as express from 'express'
import {NextFunction, Request, Response} from 'express'

import IRouteController from '../../../../common/src/interfaces/IRouteController.interface'
import {authorizationMiddleware} from '../../../../common/src/middlewares/authorization'
import {isPassed, safeTimestamp} from '../../../../common/src/utils/datetime-util'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {BadRequestException} from '../../../../common/src/exceptions/bad-request-exception'
import {ResourceNotFoundException} from '../../../../common/src/exceptions/resource-not-found-exception'
import {ForbiddenException} from '../../../../common/src/exceptions/forbidden-exception'
import {RequiredUserPermission} from '../../../../common/src/types/authorization'
import {UserService} from '../../../../common/src/service/user/user-service'

import {PassportService} from '../../../../passport/src/services/passport-service'

import {OrganizationService} from '../../../../enterprise/src/services/organization-service'

import {AccessService} from '../../service/access.service'
import {accessDTOResponseV1} from '../../models/access'

class UserController implements IRouteController {
  public router = express.Router()
  private organizationService = new OrganizationService()
  private passportService = new PassportService()
  private accessService = new AccessService()
  private userService = new UserService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const auth = authorizationMiddleware([RequiredUserPermission.RegUser], true)
    const routes = express
      .Router()
      .post('/access/enter', this.enter) // create a token and immediately enter
      .post('/access/exit', this.exit) // exit, wherever the user currently is
    this.router.use('/access/api/v1', auth, routes)
  }

  enter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {locationId, userIds, organizationId} = req.body as {
        locationId: string
        userIds: string[]
        organizationId: string
      }
      const userId = res.locals.connectedUser.id as string
      const allDependants = (await this.userService.getAllDependants(userId, true)).filter((dep) =>
        dep.organizationIds?.includes(organizationId),
      )
      const allDependantIds = new Set(allDependants.map(({id}) => id))
      if (userIds.some((id) => id !== userId && !allDependantIds.has(id))) {
        throw new BadRequestException('Not allowed to check in all user ids')
      }
      const location = await this.organizationService.getLocation(organizationId, locationId)

      if (!location)
        throw new ResourceNotFoundException(
          `location ${organizationId}/${locationId} does not exist`,
        )
      if (!location.allowsSelfCheckInOut)
        throw new BadRequestException("Location doesn't allow self-check-in")
      if (!location.allowAccess)
        throw new BadRequestException("Location can't be directly checked in to")

      const allPassports = await Promise.all(
        userIds.map((id) => this.passportService.findLatestDirectPassport(id, organizationId)),
      )
      allPassports.forEach((passport) => {
        if (!this.passportService.passportAllowsEntry(passport, location.attestationRequired)) {
          throw new ForbiddenException('Passport not found or does not allow entry')
        }
      })
      const accesses = await Promise.all(
        userIds.map((id, index) =>
          this.accessService.createV2(id, locationId, allPassports[index]?.statusToken ?? null),
        ),
      )

      res.json(actionSucceed(accesses.map(accessDTOResponseV1)))
    } catch (error) {
      next(error)
    }
  }

  exit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // TODO: this should simply remove the user from their current location, wherever it is
    try {
      const {userIds, organizationId} = req.body as {
        userIds: string[]
        organizationId: string
      }
      const userId = res.locals.connectedUser.id as string
      const allDependants = (await this.userService.getAllDependants(userId, true)).filter((dep) =>
        dep.organizationIds?.includes(organizationId),
      )
      const allDependantIds = new Set(allDependants.map(({id}) => id))
      if (userIds.some((id) => id !== userId && !allDependantIds.has(id))) {
        throw new BadRequestException('Not allowed to check out all user ids')
      }
      const accesses = await Promise.all(
        userIds.map((id) =>
          this.accessService.findLatestAnywhere(id).then((acc) => {
            if (!acc || isPassed(safeTimestamp(acc.exitAt))) {
              throw new BadRequestException(`${id} is not checked in anywhere`)
            }
            return acc
          }),
        ),
      )
      const newAccesses = await Promise.all(
        accesses.map((access) => this.accessService.handleExitV2(access)),
      )
      res.json(actionSucceed(newAccesses.map(accessDTOResponseV1)))
    } catch (error) {
      next(error)
    }
  }
}

export default UserController
