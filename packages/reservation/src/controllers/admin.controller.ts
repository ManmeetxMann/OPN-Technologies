import {NextFunction, Request, Response, Router} from 'express'
import moment from 'moment'

import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../common/src/utils/response-wrapper'
import {now} from '../../../common/src/utils/times'

import {Config} from '../../../common/src/utils/config'

import {AppoinmentService} from '../services/appoinment.service'
import {TestResultsService} from '../services/test-results.service'
import {
  TestResultsDTO,
  TestResultsConfirmationRequest,
  AppointmentDTO,
  CheckAppointmentRequest,
  SendAndSaveTestResultsRequest,
} from '../models/appoinment'
import {ResourceAlreadyExistsException} from '../../../common/src/exceptions/resource-already-exists-exception'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import CSVValidator from '../validations/CSVValidator'

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
    this.router.post(
      this.path + '/api/v1/send-and-save-test-results',
      CSVValidator.validate(CSVValidator.csvValidation()),
      this.sendAndSaveTestResults,
    )
    this.router.post(
      this.path + '/api/v1/send-test-results-again',
      CSVValidator.validate(CSVValidator.csvValidation()),
      this.sendTestResultsAgain,
    )
    this.router.post(this.path + '/api/v1/check-appointments', this.checkAppointments)
    this.router.post(
      this.path + '/api/v1/send-and-save-test-results-bulk',
      CSVValidator.validate(CSVValidator.csvBulkValidation()),
      this.sendAndSaveTestResultsBulk,
    )
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

  sendAndSaveTestResultsBulk = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const requestData: SendAndSaveTestResultsRequest = req.body
      const {todaysDate} = requestData

      const timeZone = Config.get('DEFAULT_TIME_ZONE')
      const fromDate = moment(now()).tz(timeZone).subtract(30, 'days').startOf('day')
      const toDate = moment(now()).tz(timeZone).format('YYYY-MM-DD')
  
      if (!moment(todaysDate).isBetween(fromDate, toDate)) {
        throw new BadRequestException(`Date does not match the time range (from ${fromDate} - to ${toDate})`)
      }

      const barcodeCounts = requestData.results.reduce((acc, row) => {
        if (acc[row.barCode]) {
          acc[row.barCode]++
        } else {
          acc[row.barCode] = 1
        }
        return acc
      }, {})

      const notFoundBarcodes = []

      const appointmentsByBarCode = (
        await this.appoinmentService.getAppoinmentByDate(requestData.from, requestData.to)
      ).reduce((acc, {barCode, ...currentValue}) => {
        acc[barCode] = currentValue
        return acc
      }, {})

      await Promise.all(
        requestData.results.map(async ({sendAgain, ...row}) => {
          if (barcodeCounts[row.barCode] === 1) {
            if (sendAgain) {
              const testResults = await this.testResultsService.getResults(row.barCode)
              if (!testResults) {
                throw new ResourceNotFoundException(
                  'Something wend wrong. Results are not available.',
                )
              }
              await this.testResultsService.sendTestResults({...testResults}, todaysDate)
            } else {
              const currentAppointment = appointmentsByBarCode[row.barCode]
              if (!currentAppointment) {
                notFoundBarcodes.push(row)
                return
              }
              await Promise.all([
                this.testResultsService.sendTestResults(
                  {...row, ...currentAppointment},
                  todaysDate,
                ),
                this.testResultsService.saveResults({
                  ...row,
                  ...currentAppointment,
                  appointmentId: currentAppointment.appointmentId,
                  id: row.barCode,
                }),
              ])
            }
          } else {
            notFoundBarcodes.push(row)
          }
        }),
      )

      res.json(
        actionSucceed({
          failedRows: notFoundBarcodes,
        }),
      )
    } catch (e) {
      next(e)
    }
  }

  sendAndSaveTestResults = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<unknown> => {
    try {
      const requestData: TestResultsConfirmationRequest = req.body
      const {todaysDate} = requestData

      const timeZone = Config.get('DEFAULT_TIME_ZONE')
      const fromDate = moment(now()).tz(timeZone).subtract(30, 'days').format('YYYY-MM-DD')
      const toDate = moment(now()).tz(timeZone).format('YYYY-MM-DD')
  
      if (!moment(todaysDate).isBetween(fromDate, toDate)) {
        throw new BadRequestException(`Date does not match the time range (from ${fromDate} - to ${toDate})`)
      }

      if (requestData.needConfirmation) {
        const appointment = await this.appoinmentService.getAppoinmentByBarCode(requestData.barCode)
        res.json(actionSucceed(appointment))
        return
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
          this.testResultsService.sendTestResults({...requestData, ...appointment}, todaysDate)
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

  checkAppointments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const requestData: CheckAppointmentRequest = req.body

      const alreadySents = await this.testResultsService.resultAlreadySentMany(requestData.barCodes)
      res.json(actionSucceed(alreadySents))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminController
