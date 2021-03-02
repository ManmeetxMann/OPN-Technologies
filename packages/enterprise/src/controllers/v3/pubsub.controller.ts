import * as express from 'express'
import {Handler, Router} from 'express'

import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import OPNPubSub from '../../../../common/src/service/google/pub_sub'

import {RecommendationService} from '../../services/recommendation-service'

import {PassportStatus} from '../../../../passport/src/models/passport'

import {TemperatureStatuses} from '../../../../reservation/src/models/temperature'
import {ResultTypes} from '../../../../reservation/src/models/appointment'

class RecommendationController implements IControllerBase {
  public router = express.Router()
  private recService = new RecommendationService()
  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = () => Router({mergeParams: true})
    const root = '/enterprise/api/v3/pubsub'
    const route = innerRouter().use(
      '/',
      innerRouter()
        .post('/passport', this.newPassport)
        .post('/attestation', this.newAttestation)
        .post('/temperature', this.newTemperature)
        .post('/pcr-test', this.newPCR),
    )
    this.router.use(root, route)
  }

  private parseMessage(message: {
    data: string
    attributes: Record<string, string>
  }): {userId: string; organizationId: string; actionType: string; data: Record<string, unknown>} {
    const {data, attributes} = message
    const payload = OPNPubSub.getPublishedData(data)
    return {
      userId: attributes.userId,
      organizationId: attributes.organizationId,
      actionType: attributes.actionType,
      data: payload,
    }
  }

  newPassport: Handler = async (req, res, next): Promise<void> => {
    try {
      const {userId, organizationId, data} = this.parseMessage(req.body.message)
      await this.recService.addPassport(
        userId,
        organizationId,
        data.id as string,
        data.status as PassportStatus,
        data.expiry as string,
      )
    } catch (error) {
      next(error)
    }
  }
  newAttestation: Handler = async (req, res, next): Promise<void> => {
    try {
      const {userId, organizationId, data} = this.parseMessage(req.body.message)
      await this.recService.addAttestation(
        userId,
        organizationId,
        data.id as string,
        data.status as PassportStatus,
      )
    } catch (error) {
      next(error)
    }
  }
  newTemperature: Handler = async (req, res, next): Promise<void> => {
    try {
      const {userId, organizationId, data} = this.parseMessage(req.body.message)
      await this.recService.addTemperature(
        userId,
        organizationId,
        data.id as string,
        data.temperature as string,
        data.status as TemperatureStatuses,
      )
    } catch (error) {
      next(error)
    }
  }
  newPCR: Handler = async (req, res, next): Promise<void> => {
    try {
      const {userId, organizationId, actionType, data} = this.parseMessage(req.body.message)
      if (actionType === 'canceled') {
        await this.recService.deletePCRTest(userId, organizationId)
      } else if (actionType === 'created') {
        await this.recService.addPCRTest(
          userId,
          organizationId,
          data.id as string,
          data.date as string,
        )
      } else if (actionType === 'result') {
        await this.recService.addPCRTestResult(
          userId,
          organizationId,
          data.id as string,
          data.status as ResultTypes,
        )
      }
    } catch (error) {
      next(error)
    }
  }
}

export default RecommendationController
