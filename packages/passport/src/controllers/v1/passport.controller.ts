import * as express from 'express'
import {NextFunction, Request, Response} from 'express'

import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {UserService} from '../../../../common/src/service/user/user-service'
import {BadRequestException} from '../../../../common/src/exceptions/bad-request-exception'
import {User} from '../../../../common/src/data/user'
import {authorizationMiddleware} from '../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../common/src/types/authorization'

import {PassportService} from '../../services/passport-service'
import {AttestationService} from '../../services/attestation-service'
import {AlertService} from '../../services/alert-service'
import {PassportStatuses} from '../../models/passport'
import {Attestation, AttestationAnswers, AttestationAnswersV1} from '../../models/attestation'

import {OrganizationService} from '../../../../enterprise/src/services/organization-service'

import {QuestionnaireService} from '../../../../lookup/src/services/questionnaire-service'
import {EvaluationCriteria} from '../../../../lookup/src/models/questionnaire'

class PassportController implements IControllerBase {
  public path = '/passport/api/v1/passport'
  public router = express.Router()
  private passportService = new PassportService()
  private attestationService = new AttestationService()
  private organizationService = new OrganizationService()
  private userService = new UserService()
  private questionnaireService = new QuestionnaireService()
  private alertService = new AlertService()

  constructor() {
    this.initRoutes()
  }

  private async evaluateAnswers(
    questionnaireId: string,
    answers: AttestationAnswersV1,
  ): Promise<PassportStatuses> {
    const {
      values,
      caution,
      stop,
    }: EvaluationCriteria = await this.questionnaireService.getAnswerLogic(questionnaireId)

    const score = values
      .map((value: number, index: number) => (answers[index][0] ? value : 0))
      .reduce((total, current) => total + current)

    if (score >= stop) {
      return PassportStatuses.Stop
    }

    if (score >= caution) {
      return PassportStatuses.Caution
    }

    return PassportStatuses.Proceed
  }

  public initRoutes(): void {
    const auth = authorizationMiddleware([RequiredUserPermission.RegUser], true)
    // this.router.get(this.path + '/status', this.check)
    this.router.post(this.path + '/status', auth, this.update)
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = res.locals.authenticatedUser as User
      const {organizationId, userIds} = req.body as {
        organizationId: string
        userIds: string[]
      }
      if (userIds.length === 0) {
        throw new BadRequestException('Must specify at least one user')
      }
      const [organization, orgLocations, allDependants] = await Promise.all([
        this.organizationService.getByIdOrThrow(organizationId),
        this.organizationService.getLocations(organizationId),
        this.userService.getAllDependants(user.id, true),
      ])

      const dependantIds = userIds.filter((id) => id !== user.id)
      dependantIds.forEach((id) => {
        const dependant = allDependants.find((dep) => dep.id === id)
        if (!dependant || !dependant.organizationIds?.includes(organizationId)) {
          throw new BadRequestException(`Org ${organizationId} has no dependant ${id}`)
        }
      })

      let questionnaireId: string
      // @ts-ignore
      questionnaireId = organization.questionnaireId
      if (!questionnaireId) {
        const allQuestionnaires = new Set(
          orgLocations.map((org) => org.questionnaireId).filter((notNull) => notNull),
        )
        if (!allQuestionnaires.size) {
          throw new BadRequestException('No questionnaire id found')
        }
        if (allQuestionnaires.size > 1) {
          throw new BadRequestException(`Org ${organizationId} has several questionnaire ids`)
        }
        questionnaireId = allQuestionnaires.keys()[0]
      }
      const answers: AttestationAnswersV1 = req.body.answers
      let passportStatus = await this.evaluateAnswers(questionnaireId, answers)

      const isTemperatureCheckEnabled = await this.organizationService.isTemperatureCheckEnabled(
        organizationId,
      )

      if (isTemperatureCheckEnabled && passportStatus === PassportStatuses.Proceed) {
        passportStatus = PassportStatuses.TemperatureCheckRequired
      }

      const saved = await this.attestationService.save({
        answers: answers as AttestationAnswers,
        locationId: orgLocations[0].id, // to be removed
        userId: user.id,
        appliesTo: userIds,
        status: passportStatus,
        questionnaireId,
      } as Attestation)

      const allPassports = await Promise.all(
        userIds.map((userId) => this.passportService.create(passportStatus, userId, [], true)),
      )
      if ([PassportStatuses.Caution, PassportStatuses.Stop].includes(passportStatus)) {
        // TODO: we should only send one alert for all of the passports
        allPassports.forEach((passport) =>
          this.alertService.sendAlert(passport, saved, organizationId, null),
        )
      }

      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }
}

export default PassportController
