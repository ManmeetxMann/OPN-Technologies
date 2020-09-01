import * as express from 'express'
import {NextFunction, Request, Response} from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'

import Validation from '../../../common/src/utils/validation'
import {OrganizationService} from '../services/organization-service'
import {OrganizationConnectionRequest} from '../models/organization-connection-request'
import {UserService} from '../../../common/src/service/user/user-service'
import {User} from '../../../common/src/data/user'
import {actionSucceed} from '../../../common/src/utils/response-wrapper'
import {Organization} from '../models/organization'

class UserController implements IControllerBase {
  public path = '/user'
  public router = express.Router()
  private organizationService = new OrganizationService()
  private userService = new UserService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.post(this.path + '/connect/add', this.connect)
    this.router.post(this.path + '/connect/remove', this.disconnect)
    this.router.post(this.path + '/connect/locations', this.connectedLocations)
  }

  // Note: Doesn't handle multiple organizations per user as well as checking an existing connection
  connect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // TODO Assert birthYear meets legal requirements

      const {responses, ...body} = req.body
      body as OrganizationConnectionRequest
      responses as string[]
      // Fetch org and group by key
      const {
        key,
        firstName,
        lastNameInitial,
        birthYear,
        base64Photo,
      } = req.body as OrganizationConnectionRequest

      // Fetch org by key
      const {organization, group} = await this.organizationService.findOrganizationAndGroupByKey(
        key,
      )
      const registrationQuestions = organization.registrationQuestions ?? []
      if (registrationQuestions.length) {
        if (!responses) {
          throw new Error(`${organization.name} requires responses`)
        }
        if (responses.length !== registrationQuestions.length) {
          throw new Error(
            `${organization.name} expects ${registrationQuestions.length} answers but ${responses.length} were provided`,
          )
        }
      }

      // validate that responses are present and valid
      const registrationAnswers = (responses ?? []).map((responseValue: string, index: number) => {
        const question = registrationQuestions[index]
        if (
          question.options &&
          question.options.length &&
          !question.options.map(({code}) => code).includes(responseValue)
        ) {
          throw new Error(`Answer ${responseValue} is not a valid response`)
        }
        return {
          questionText: question.questionText,
          responseValue,
        }
      })
      // Create user
      const user = await this.userService.create({
        firstName,
        lastNameInitial,
        birthYear,
        base64Photo,
        organizationIds: [organization.id],
        registrationAnswers: {[organization.id]: registrationAnswers},
      } as User)

      // Add user to group
      await this.organizationService.addUsersToGroup(organization.id, group.id, [user.id])

      res.json(actionSucceed({user, organization, group}))
    } catch (error) {
      next(error)
    }
  }

  disconnect = (req: Request, res: Response): void => {
    if (!Validation.validate(['key'], req, res)) {
      return
    }

    console.log(req.body.key)
    const response = {
      // data : {

      // },
      status: 'complete',
    }

    res.json(response)
  }

  connectedLocations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {userId} = req.body
      const user = await this.userService.findOne(userId)
      const organizations: Organization[] = await Promise.all(
        user.organizationIds
          .map((organizationId) => this.organizationService.findOneById(organizationId))
          .filter((org) => !!org),
      )
      res.json(actionSucceed(organizations))
    } catch (error) {
      next(error)
    }
  }
}

export default UserController
