import * as express from 'express'
import {Handler, Router} from 'express'

import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {OPNPubSub} from '../../../../common/src/service/google/pub_sub'

import {PassportStatus, PassportStatuses, Passport} from '../../models/passport'
import {PassportService} from '../../services/passport-service'
import {AttestationService} from '../../services/attestation-service'

import {OrganizationService} from '../../../../enterprise/src/services/organization-service'

import {TemperatureStatuses} from '../../../../reservation/src/models/temperature'
import {ResultTypes} from '../../../../reservation/src/models/appointment'
import {AlertService} from '../../services/alert-service'

const passportStatusByPCR = {
  [ResultTypes.Positive]: PassportStatuses.Stop,
  [ResultTypes.PresumptivePositive]: PassportStatuses.Stop,
  [ResultTypes.PreliminaryPositive]: PassportStatuses.Stop,
  [ResultTypes.Inconclusive]: PassportStatuses.Stop,
  [ResultTypes.Invalid]: PassportStatuses.Stop,
  [ResultTypes.Indeterminate]: PassportStatuses.Stop,
  [ResultTypes.Negative]: PassportStatuses.Proceed,
  [ResultTypes.Pending]: null,
}

const passportStatusByTemp = {
  [TemperatureStatuses.Proceed]: PassportStatuses.Proceed,
  [TemperatureStatuses.Stop]: PassportStatuses.Stop,
}

class RecommendationController implements IControllerBase {
  public router = express.Router()
  private passportService = new PassportService()
  private attService = new AttestationService()
  private orgService = new OrganizationService()
  private alertService = new AlertService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = () => Router({mergeParams: true})
    const root = '/passport/api/v1/pubsub'
    const route = innerRouter().use(
      '/',
      innerRouter()
        .post('/attestation', this.newAttestation) // attestation-topic
        .post('/temperature', this.newTemperature) // temperature-topic
        .post('/pcr-test', this.pcrTest), // pcr-test-topic
    )
    this.router.use(root, route)
  }

  private async parseMessage(message: {
    data: string
    attributes: Record<string, string>
  }): Promise<{
    userId: string
    organizationId: string
    actionType: string
    data: Record<string, unknown>
  }> {
    const {data, attributes} = message
    const payload = await OPNPubSub.getPublishedData(data)
    return {
      userId: attributes.userId,
      organizationId: attributes.organizationId,
      actionType: attributes.actionType,
      data: (payload as unknown) as Record<string, unknown>,
    }
  }

  private async alertIfNeeded(passport: Passport, attestationId?: string | null): Promise<void> {
    const status = passport.status
    if ([PassportStatuses.Caution, PassportStatuses.Stop].includes(status as PassportStatuses)) {
      const att = attestationId ? await this.attService.getByAttestationId(attestationId) : null
      this.alertService.sendAlert(passport, att, passport.organizationId, null)
    }
  }

  newAttestation: Handler = async (req, res, next): Promise<void> => {
    try {
      const {userId, organizationId, data} = await this.parseMessage(req.body.message)
      const org = await this.orgService.findOneById(organizationId)
      const attStatus = data.status as PassportStatus
      const status =
        attStatus === PassportStatuses.Proceed
          ? org.enableTemperatureCheck
            ? PassportStatuses.TemperatureCheckRequired
            : PassportStatuses.Proceed
          : attStatus
      const passport = await this.passportService.create(status, userId, [], true, organizationId)
      await this.alertIfNeeded(passport, data.id as string)
      res.sendStatus(200)
    } catch (error) {
      next(error)
    }
  }
  newTemperature: Handler = async (req, res, next): Promise<void> => {
    try {
      const {userId, organizationId, data} = await this.parseMessage(req.body.message)
      const status = passportStatusByTemp[data.status as TemperatureStatuses]
      if (status) {
        const passport = await this.passportService.create(status, userId, [], true, organizationId)
        await this.alertIfNeeded(passport)
      }
      res.sendStatus(200)
    } catch (error) {
      next(error)
    }
  }
  pcrTest: Handler = async (req, res, next): Promise<void> => {
    try {
      const {userId, organizationId, data} = await this.parseMessage(req.body.message)
      const status = passportStatusByPCR[data.status as ResultTypes]
      if (status) {
        const passport = await this.passportService.create(status, userId, [], true, organizationId)
        await this.alertIfNeeded(passport)
      }
      res.sendStatus(200)
    } catch (error) {
      next(error)
    }
  }
}

export default RecommendationController
