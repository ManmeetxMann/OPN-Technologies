import {NextFunction, Request, Response, Router} from 'express'

import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../common/src/utils/response-wrapper'

import {AppoinmentService} from '../services/appoinment.service'
import {TestResultsService} from '../services/test-results.service'
import {TestResultsDTO, TestResultsConfirmationRequest, AppointmentDTO} from '../models/appoinment'
import {ResourceAlreadyExistsException} from '../../../common/src/exceptions/resource-already-exists-exception'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'

class AdminController implements IControllerBase {
  public path = '/admin'
  public router = Router()
  private appoinmentService = new AppoinmentService()
  private testResultsService = new TestResultsService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.post(this.path + '/api/v1/appointment', this.getAppointmentByBarCode)
    this.router.post(this.path + '/api/v1/send-and-save-test-results', this.sendAndSaveTestResults)
    this.router.post(this.path + '/api/v1/send-test-results-again', this.sendTestResultsAgain)
  }

  getAppointmentByBarCode = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {barCodeNumber} = req.body

      const appointment = await this.appoinmentService.getAppoinmentByBarCode(barCodeNumber)

      res.json(actionSucceed(appointment))
    } catch (error) {
      next(error)
    }
  }

  sendAndSaveTestResults = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<unknown> => {
    try {
      const requestData: TestResultsConfirmationRequest = req.body

      if (requestData.needConfirmation) {
        const appointment = await this.appoinmentService.getAppoinmentByBarCode(requestData.barCode)

        return res.json(actionSucceed(appointment))
      }

      const resultAlreadySent = await this.testResultsService.resultAlreadySent(requestData.barCode)
      if (resultAlreadySent) {
        throw new ResourceAlreadyExistsException(
          requestData.barCode,
          'Test Results are already sent.',
        )
      }

      await this.appoinmentService
        .getAppoinmentByBarCode(requestData.barCode)
        .then((appointment: AppointmentDTO) => {
          this.testResultsService.sendTestResults({...requestData, ...appointment})
          return appointment
        })
        .then((appointment: AppointmentDTO) => {
          this.testResultsService.saveResults({
            ...requestData,
            ...appointment,
            appointmentId: appointment.appointmentId,
            id: requestData.barCode,
          })
        })

      res.json(actionSucceed('Results are sent successfully'))
    } catch (error) {
      next(error)
    }
  }

  sendTestResultsAgain = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const requestData: TestResultsDTO = req.body

      const testResults = await this.testResultsService.getResults(requestData.barCode)
      if (!testResults) {
        throw new ResourceNotFoundException('Something wend wrong. Results are not avaiable.')
      }
      await this.testResultsService.sendTestResults({...testResults})

      res.json(actionSucceed('Results are sent successfully'))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminController
