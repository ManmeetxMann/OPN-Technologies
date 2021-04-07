import * as express from 'express'
import {Handler, Router} from 'express'

import {LogWarning} from '../../../../../common/src/utils/logging-setup'
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'

import {OrganizationService} from '../../../../../enterprise/src/services/organization-service'
import {StatusStatsService} from '../../../../../enterprise/src/services/status-stats-service'

import {PassportStatus, PassportStatuses} from '../../../../../passport/src/models/passport'

import {TemperatureStatuses} from '../../../../../reservation/src/models/temperature'

import {RecommendationService} from '../../../services/recommendation-service'
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
        .post('/pulse', this.newPulse)
        .post('/passport', this.newPassport),
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
  newPassport: Handler = async (req, res, next): Promise<void> => {
    try {
      const {userId, organizationId, id, status, expiry} = req.body
      const recPromise = this.recService.addPassport(
        userId,
        organizationId,
        id as string,
        status as PassportStatus,
        expiry as string,
      )
      const statsPromise = this.orgService
        .getUserGroupId(organizationId, userId)
        .then((groupId) => {
          if (groupId) {
            return this.statsService.updateStatsForUser(
              organizationId,
              groupId,
              userId,
              status as PassportStatuses,
            )
          }
          LogWarning('RecommendationController', 'newPassport', {
            message: `User ${userId} has no group in ${organizationId}`,
          })
        })
      await Promise.all([recPromise, statsPromise])
      res.sendStatus(200)
    } catch (error) {
      next(error)
    }
  }
}

export default RecommendationController
