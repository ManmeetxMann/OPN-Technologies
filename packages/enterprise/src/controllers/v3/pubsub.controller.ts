import * as express from 'express'
import {Handler, Router} from 'express'

import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {OPNPubSub} from '../../../../common/src/service/google/pub_sub'

import {RecommendationService} from '../../services/recommendation-service'
import {StatusStatsService} from '../../services/status-stats-service'
import {OrganizationService} from '../../services/organization-service'

import {PassportStatus, PassportStatuses} from '../../../../passport/src/models/passport'

import {TemperatureStatuses} from '../../../../reservation/src/models/temperature'
import {
  ResultTypes,
  AppointmentStatus,
  TestTypes,
} from '../../../../reservation/src/models/appointment'

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
    const root = '/enterprise/api/v3/pubsub'
    const route = innerRouter().use(
      '/',
      innerRouter()
        .post('/passport', this.newPassport) // passport-topic
        .post('/attestation', this.newAttestation) // attestation-topic
        .post('/temperature', this.newTemperature) // temperature-topic
        .post('/test-appointment', this.testAppointment) // test-appointment-topic
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

  newPassport: Handler = async (req, res, next): Promise<void> => {
    try {
      const {userId, organizationId, data} = await this.parseMessage(req.body.message)
      const recPromise = this.recService.addPassport(
        userId,
        organizationId,
        data.id as string,
        data.status as PassportStatus,
        data.expiry as string,
      )
      const statsPromise = this.orgService
        .getUserGroupId(organizationId, userId)
        .then((groupId) => {
          if (groupId) {
            return this.statsService.updateStatsForUser(
              organizationId,
              groupId,
              userId,
              data.status as PassportStatuses,
            )
          }
          console.warn(`User ${userId} has no group in ${organizationId}`)
        })
      await Promise.all([recPromise, statsPromise])
      res.sendStatus(200)
    } catch (error) {
      next(error)
    }
  }
  newAttestation: Handler = async (req, res, next): Promise<void> => {
    try {
      const {userId, organizationId, data} = await this.parseMessage(req.body.message)
      await this.recService.addAttestation(
        userId,
        organizationId,
        data.id as string,
        data.status as PassportStatus,
      )
      res.sendStatus(200)
    } catch (error) {
      next(error)
    }
  }
  newTemperature: Handler = async (req, res, next): Promise<void> => {
    try {
      const {userId, organizationId, data} = await this.parseMessage(req.body.message)
      await this.recService.addTemperature(
        userId,
        organizationId,
        data.id as string,
        data.temperature as string,
        data.status as TemperatureStatuses,
      )
      res.sendStatus(200)
    } catch (error) {
      next(error)
    }
  }
  pcrTest: Handler = async (req, res, next): Promise<void> => {
    try {
      const {userId, organizationId, data} = await this.parseMessage(req.body.message)
      await this.recService.addPCRTestResult(
        userId,
        organizationId,
        data.id as string,
        data.result as ResultTypes,
      )
      res.sendStatus(200)
    } catch (error) {
      next(error)
    }
  }
  testAppointment: Handler = async (req, res, next): Promise<void> => {
    try {
      const {userId, organizationId, actionType, data} = await this.parseMessage(req.body.message)
      if (data.testType !== TestTypes.PCR) {
        // only care about PCR for now
        res.sendStatus(200)
        return
      }
      if (actionType === 'canceled') {
        await this.recService.deletePCRAppointment(userId, organizationId)
      } else {
        await this.recService.addPCRAppointment(
          userId,
          organizationId,
          data.id as string,
          data.status as AppointmentStatus,
          data.date as string,
        )
      }
      res.sendStatus(200)
    } catch (error) {
      next(error)
    }
  }
}

export default RecommendationController
