import * as express from 'express'
import {Handler, Router} from 'express'

import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {OPNPubSub} from '../../../../../common/src/service/google/pub_sub'

import {RecommendationService} from '../../../services/recommendation-service'
import {StatusStatsService} from '../../../services/status-stats-service'
import {OrganizationService} from '../../../services/organization-service'

import {PassportStatus, PassportStatuses} from '../../../../../passport/src/models/passport'

import {TemperatureStatuses} from '../../../../../reservation/src/models/temperature'
import {
  ResultTypes,
  AppointmentStatus,
  TestTypes,
} from '../../../../../reservation/src/models/appointment'
import {AddPulse} from '../../../types/recommendations'

class RecommendationController implements IControllerBase {
  public router = express.Router()
  private recService = new RecommendationService()
  private statsService = new StatusStatsService()
  private orgService = new OrganizationService()
  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = () => Router({mergeParams: true})
    const root = '/enterprise/api/v1/internal'
    const route = innerRouter().use(
      '/',
      innerRouter()
        .post('/attestation', this.newAttestation)
        .post('/temperature', this.newTemperature)
        .post('/pulse', this.newPulse),
    )
    this.router.use(root, route)
  }

  newAttestation: Handler = async (req, res, next): Promise<void> => {
    try {
      const {userId, organizationId, id, status} = req.body
      await this.recService.addAttestation(
        userId,
        organizationId,
        id as string,
        status as PassportStatus,
      )
      res.sendStatus(200)
    } catch (error) {
      next(error)
    }
  }

  newTemperature: Handler = async (req, res, next): Promise<void> => {
    try {
      const {id, status, temperature, userId, organizationId} = req.body
      await this.recService.addTemperature(
        userId,
        organizationId,
        id as string,
        temperature as string,
        status as TemperatureStatuses,
      )
      res.sendStatus(200)
    } catch (error) {
      next(error)
    }
  }

  newPulse: Handler = async (req, res, next): Promise<void> => {
    try {
      // const {userId, organizationId, data} = await this.parseMessage(req.body.message)
      const {userId, organizationId, pulse, oxygen, pulseId, status} = req.body as AddPulse
      await this.recService.addPulse({
        userId,
        pulse,
        oxygen,
        organizationId,
        pulseId,
        status,
      })
      res.sendStatus(200)
    } catch (error) {
      next(error)
    }
  }
}

export default RecommendationController
