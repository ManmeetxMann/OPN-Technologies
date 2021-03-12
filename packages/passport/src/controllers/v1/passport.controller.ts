import * as express from 'express'
import { NextFunction, Request, Response } from 'express'

import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import { actionSucceed } from '../../../../common/src/utils/response-wrapper'
import { UserService } from '../../../../common/src/service/user/user-service'
import { BadRequestException } from '../../../../common/src/exceptions/bad-request-exception'
import { User, userDTO } from '../../../../common/src/data/user'
import { safeTimestamp } from '../../../../common/src/utils/datetime-util'
import { authorizationMiddleware } from '../../../../common/src/middlewares/authorization'
import { RequiredUserPermission } from '../../../../common/src/types/authorization'

import { AccessService } from '../../../../access/src/service/access.service'
import { PassportService } from '../../services/passport-service'
import { AttestationService } from '../../services/attestation-service'
import { AlertService } from '../../services/alert-service'
import { PassportStatuses, passportDTO } from '../../models/passport'
import { Attestation, AttestationAnswers, AttestationAnswersV1 } from '../../models/attestation'
import { OrganizationService } from '../../../../enterprise/src/services/organization-service'

import { QuestionnaireService } from '../../../../lookup/src/services/questionnaire-service'

class PassportController implements IControllerBase {
  public path = '/passport/api/v1'
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

  public initRoutes(): void {
    const auth = authorizationMiddleware([RequiredUserPermission.RegUser], true)
    this.router.get(this.path + '/passport', auth, this.check)
    this.router.post(this.path + '/attestation', auth, this.update)
    this.router.get(this.path + '/attestation/:attestationId', auth, this.get)
  }

  check = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = res.locals.authenticatedUser as User
      const { organizationId } = req.query as {
        organizationId: string
      }
      const allDependants = (await this.userService.getAllDependants(user.id, true)).filter((dep) =>
        dep.organizationIds?.includes(organizationId),
      )
      const response = (
        await Promise.all(
          [user, ...allDependants].map(async (user) => ({
            user,
            passport: await this.passportService.findLatestDirectPassport(user.id, organizationId),
          })),
        )
      ).map((body) => ({
        user: userDTO(body.user),
        passport: body.passport ? passportDTO(body.passport) : null,
      }))
      res.json(actionSucceed(response))
    } catch (error) {
      next(error)
    }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = res.locals.authenticatedUser as User
      const { organizationId, userIds } = req.body as {
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
          console.warn(allQuestionnaires)
          throw new BadRequestException(`Org ${organizationId} has several questionnaire ids`)
        }
        questionnaireId = [...allQuestionnaires][0]
      }
      const answers: AttestationAnswersV1 = req.body.answers
      let passportStatus
      try {
        passportStatus = await this.questionnaireService.evaluateAnswers(questionnaireId, answers)
      } catch {
        throw new BadRequestException("Couldn't evaluate answers")
      }

      const saved = await this.attestationService.save({
        answers: answers.map((answer) => ({
          [0]: answer.answer,
          [1]: answer.additionalValue ?? null,
        })) as AttestationAnswers,
        organizationId,
        locationId: orgLocations[0].id, // to be removed
        userId: user.id,
        appliesTo: userIds,
        status: passportStatus,
        questionnaireId,
      } as Attestation)

      const isTemperatureCheckEnabled = await this.organizationService.isTemperatureCheckEnabled(
        organizationId,
      )

      if (isTemperatureCheckEnabled && passportStatus === PassportStatuses.Proceed) {
        passportStatus = PassportStatuses.TemperatureCheckRequired
      }

      const allPassports = await Promise.all(
        userIds.map((userId) =>
          this.passportService.create(passportStatus, userId, [], true, organizationId),
        ),
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

  get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authenticatedUser = res.locals.connectedUser as User
      const usedId = authenticatedUser.id
      const { attestationId } = req.params as {
        attestationId: string
      }
      const { organizationid } = req.headers as {
        organizationid: string
      }

      // Get attestation by id, check if it exist and belong to the user and organization
      const attestation = await this.attestationService.getByAttestationId(attestationId)
      if (!attestation) {
        throw new BadRequestException("Couldn't find attestation")
      }
      if (attestation.userId !== usedId) {
        throw new BadRequestException("Attestation doesn't belong to the user")
      }
      if (attestation.organizationId !== organizationid) {
        throw new BadRequestException("Attestation doesn't belong to the organization")
      }

      // Validate answers and fetch questions
      const { questionnaireId, answers } = attestation
      const mappedAnswers = Object.keys(answers).map(answerKey => {
        return {
          questionId: Number(answerKey) + 1,
          answer: answers[answerKey][0],
          additionalValue: answers[answerKey][1]
        }
      }) as AttestationAnswersV1
      const [status, questionnaires] = await Promise.all([
        this.questionnaireService.evaluateAnswers(questionnaireId, mappedAnswers),
        this.questionnaireService.getQuestionnaires([questionnaireId])
      ])

      // Merge questions and answers by index
      const answersResults = []
      const { questions } = questionnaires[0]
      Object.keys(questions).forEach(questionKey => {
        const question = questions[questionKey]
        const answersResult = {
          question: question.value
        }
        Object.keys(question.answers).forEach((questionAnswerKey, questionsAnswersIndex) => {
          const questionAnswer = question.answers[questionAnswerKey]
          answersResult[questionAnswer] =  answers[Number(questionKey) - 1][questionsAnswersIndex]
        })
        answersResults.push(answersResult)
      })

      // Build and returns result
      const { id, locationId, attestationTime } = attestation
      const response = {
        id,
        locationId,
        answers: answersResults,
        attestationTime: safeTimestamp(attestationTime),
        status
      }
      res.json(actionSucceed(response))
    } catch (error) {
      next(error)
    }
  }
}

export default PassportController
