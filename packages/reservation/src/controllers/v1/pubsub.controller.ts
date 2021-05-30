import * as express from 'express'
import {Handler, Router} from 'express'

import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {OPNPubSub} from '../../../../common/src/service/google/pub_sub'

import {PCRTestResultsService} from '../../services/pcr-test-results.service'
import {EmailNotficationTypes, PCRResultActions} from '../../models/pcr-test-results'
import {AppoinmentService} from '../../services/appoinment.service'
import {LabService} from '../../services/lab.service'
import {BadRequestException} from '../../../../common/src/exceptions/bad-request-exception'

class PubsubController implements IControllerBase {
  public router = express.Router()
  private pcrTestResultsService = new PCRTestResultsService()
  private appoinmentService = new AppoinmentService()
  private labService = new LabService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = () => Router({mergeParams: true})
    const root = '/reservation/api/v1/pubsub'
    const route = innerRouter().use(
      '/',
      innerRouter().post('/test-result', this.pcrTestResult).post('/test-result/test', this.test),
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

  pcrTestResult: Handler = async (req, res, next): Promise<void> => {
    try {
      const {data} = await this.parseMessage(req.body.message)

      const testResult = await this.pcrTestResultsService.getPCRResultsById(data.id as string)

      const [appointment, lab] = await Promise.all([
        this.appoinmentService.getAppointmentDBById(testResult.appointmentId),
        this.labService.findOneById(testResult.labId),
      ])

      await this.pcrTestResultsService.sendNotification(
        {...testResult, ...appointment, labAssay: lab.assay},
        data.notficationType as PCRResultActions | EmailNotficationTypes,
        testResult.id,
      )

      res.sendStatus(200)
    } catch (error) {
      next(error)
    }
  }

  test: Handler = async (req, res, next): Promise<void> => {
    try {
      const {pcrId, userId} = req.body as {userId: string; pcrId: string}
      const testResult = await this.pcrTestResultsService.getPCRResultsById(pcrId as string)

      if (!testResult) {
        throw new BadRequestException('Test result not found')
      }
      const [appointment, lab] = await Promise.all([
        this.appoinmentService.getAppointmentDBById(testResult.appointmentId),
        this.labService.findOneById(testResult.labId),
      ])

      if (!appointment) {
        throw new BadRequestException('Appointment result not found')
      }

      await this.pcrTestResultsService.sendPushNotification(
        {...testResult, ...appointment, labAssay: lab?.assay},
        userId,
      )

      res.sendStatus(200)
    } catch (error) {
      next(error)
    }
  }
}

export default PubsubController
