import * as express from 'express'
import {Handler, Router} from 'express'

import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {OPNPubSub} from '../../../../../common/src/service/google/pub_sub'
import {LogError} from '../../../../../common/src/utils/logging-setup'
import {PCRTestResultsService} from '../../../services/pcr-test-results.service'
import {PCRTestResultSubmitted} from '../../../models/pcr-test-results'
import {AppoinmentService} from '../../../services/appoinment.service'
import {LabService} from '../../../services/lab.service'
import {BadRequestException} from '../../../../../common/src/exceptions/bad-request-exception'

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
    const root = '/reservation/internal/api/v1/test-result'
    const route = innerRouter().use(
      '/',
      innerRouter()
        .post('/notify-by-email', this.notifyByEmail)
        .post('/notify-by-push-notification', this.notifyByPushNotification)
        .post('/test-push-notification', this.test),
    )
    this.router.use(root, route)
  }

  notifyByEmail: Handler = async (req, res, next): Promise<void> => {
    try {
      const data = (await OPNPubSub.getPublishedData(
        req.body.message.data,
      )) as PCRTestResultSubmitted

      const testResult = await this.pcrTestResultsService.getPCRResultsById(data.id as string)

      const [appointment, lab] = await Promise.all([
        this.appoinmentService.getAppointmentDBById(testResult.appointmentId),
        this.labService.findOneById(testResult.labId),
      ])

      try {
        await this.pcrTestResultsService.sendEmailNotificationForResults(
          {...testResult, ...appointment, id: testResult.id, labAssay: lab?.assay ?? null},
          data.actionType,
          testResult.id,
        )
      } catch (error) {
        LogError('PubsubController:pcrTestResult', 'FailedToSendEmailNotification', {
          errorMessage: error.toString(),
        })
      }

      res.sendStatus(200)
    } catch (error) {
      next(error)
    }
  }

  notifyByPushNotification: Handler = async (req, res, next): Promise<void> => {
    try {
      const data = (await OPNPubSub.getPublishedData(
        req.body.message.data,
      )) as PCRTestResultSubmitted

      const testResult = await this.pcrTestResultsService.getPCRResultsById(data.id as string)

      const [appointment, lab] = await Promise.all([
        this.appoinmentService.getAppointmentDBById(testResult.appointmentId),
        this.labService.findOneById(testResult.labId),
      ])

      try {
        await this.pcrTestResultsService.sendPushNotification(
          {...testResult, ...appointment, id: testResult.id, labAssay: lab?.assay},
          testResult.userId,
        )
      } catch (error) {
        LogError('PubsubController:pcrTestResult', 'FailedToSendPushNotification', {
          errorMessage: error.toString(),
        })
      }

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
        {...testResult, ...appointment, id: testResult.id, labAssay: lab?.assay},
        userId,
      )

      res.sendStatus(200)
    } catch (error) {
      next(error)
    }
  }
}

export default PubsubController
