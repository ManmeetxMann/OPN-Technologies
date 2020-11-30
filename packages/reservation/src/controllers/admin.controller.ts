import {NextFunction, Request, Response, Router} from 'express'
import moment from 'moment'

import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../common/src/utils/response-wrapper'
import {now} from '../../../common/src/utils/times'
import {Config} from '../../../common/src/utils/config'

import {middlewareGenerator} from '../../../common/src/middlewares/basic-auth'

import {AppoinmentService} from '../services/appoinment.service'
import {TestResultsService} from '../services/test-results.service'
import {PackageService} from '../services/package.service'
import {
  TestResultsDTO,
  TestResultsConfirmationRequest,
  AppointmentDTO,
  CheckAppointmentRequest,
  SendAndSaveTestResultsRequest,
  ResultTypes,
} from '../models/appoinment'
import {ResourceAlreadyExistsException} from '../../../common/src/exceptions/resource-already-exists-exception'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {HttpException} from '../../../common/src/exceptions/httpexception'

import CSVValidator from '../validations/csv.validations'
import {PackageByOrganizationRequest} from '../models/packages'

class AdminController implements IControllerBase {
  public path = ''
  public router = Router()
  private appoinmentService = new AppoinmentService()
  private testResultsService = new TestResultsService()
  private packageService = new PackageService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    innerRouter
      .post(this.path + '/api/v1/appointment', this.getAppointmentByBarCode)
      .post(
        this.path + '/api/v1/send-and-save-test-results',
        CSVValidator.csvValidation,
        this.sendAndSaveTestResults,
      )
      .post(this.path + '/api/v1/send-test-results-again', this.sendTestResultsAgain)
      .post(this.path + '/api/v1/check-appointments', this.checkAppointments)
      .post(
        this.path + '/api/v1/send-and-save-test-results-bulk',
        CSVValidator.csvBulkValidation,
        this.sendAndSaveTestResultsBulk,
      )
      .post(this.path + '/api/v1/send-fax-for-positive', this.sendFax)
      .get(this.path + '/api/v1/test-results', this.getResultsByOrganizationId)
    this.router.use('/admin', 
    // middlewareGenerator(Config.get('RESERVATION_PASSWORD')),
    innerRouter)
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
      const {resultDate} = requestData

      const timeZone = Config.get('DEFAULT_TIME_ZONE')
      const fromDate = moment(now()).tz(timeZone).subtract(30, 'days').startOf('day')
      const toDate = moment(now()).tz(timeZone).format('YYYY-MM-DD')

      if (!moment(resultDate).isBetween(fromDate, toDate, undefined, '[]')) {
        throw new BadRequestException(
          `Date does not match the time range (from ${fromDate} - to ${toDate})`,
        )
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
            const testResults = await this.testResultsService.getResults(row.barCode)

            if (sendAgain) {
              if (!testResults) {
                throw new ResourceNotFoundException(
                  'Something wend wrong. Results are not available.',
                )
              }
              await this.testResultsService.sendTestResults({...testResults}, resultDate)
            } else {
              const currentAppointment = appointmentsByBarCode[row.barCode]
              if (!currentAppointment) {
                notFoundBarcodes.push(row)
                return
              }
              await Promise.all([
                this.testResultsService.sendTestResults(
                  {...row, ...currentAppointment},
                  resultDate,
                ),
                this.testResultsService.saveResults({
                  ...row,
                  ...currentAppointment,
                  appointmentId: currentAppointment.appointmentId,
                  id: row.barCode,
                }),
                this.packageService.savePackage(currentAppointment.packageCode)
              ])
            }

            if (row.result === ResultTypes.Positive) {
              if (!testResults) {
                throw new ResourceNotFoundException(
                  'Something wend wrong. Results are not available.',
                )
              }
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
      const {resultDate} = requestData

      const timeZone = Config.get('DEFAULT_TIME_ZONE')
      const fromDate = moment(now()).tz(timeZone).subtract(30, 'days').format('YYYY-MM-DD')
      const toDate = moment(now()).tz(timeZone).format('YYYY-MM-DD')

      if (!moment(resultDate).isBetween(fromDate, toDate, undefined, '[]')) {
        throw new BadRequestException(
          `Date does not match the time range (from ${fromDate} - to ${toDate})`,
        )
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
          this.testResultsService.sendTestResults({...requestData, ...appointment}, resultDate)
          return appointment
        })
        .then((appointment: AppointmentDTO) => {
          this.testResultsService.saveResults({
            ...requestData,
            ...appointment,
            appointmentId: appointment.appointmentId,
            id: requestData.barCode,
          })
          return appointment
        })
        // .then((appointment: AppointmentDTO) => {
        //   this.packageService.savePackage(appointment.packageCode)
        // })

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
      const resultDate = testResults.resultDate || testResults.todaysDate
      await this.testResultsService.sendTestResults({...testResults}, resultDate)

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

  sendFax = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {barCode, faxNumber} = req.body

      const testResults = await this.testResultsService.getResults(barCode)

      if (!testResults) {
        throw new ResourceNotFoundException('Results are not available.')
      }

      if (testResults.result !== ResultTypes.Positive) {
        throw new ResourceNotFoundException('Only positive results can be sent')
      }

      const result = await this.testResultsService.sendFax(testResults, faxNumber)
      const error = JSON.parse(result).error
      if (!error) {
        res.json(actionSucceed('Fax are sent successfully'))
      } else {
        throw new HttpException(error.message, 500)
      }
    } catch (error) {
      next(error)
    }
  }

  getResultsByOrganizationId = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {
        perPage,
        page,
        organizationId,
        dateOfAppointment,
      } = req.query as PackageByOrganizationRequest

      if (perPage < 1 || page < 0) {
        throw new BadRequestException(`Pagination params are invalid`)
      }
      const allpackages = await this.packageService.getAllByOrganizationId(organizationId)

      if (!allpackages) {
        throw new ResourceNotFoundException('Results are not available for this organization')
      }

      const packagesId: string[] = allpackages.map(({packageCode}) => packageCode)

      const testResult = await this.testResultsService.getAllByOrganizationId(
        packagesId,
        dateOfAppointment,
        page,
        perPage,
      )

      res.json(actionSucceed(testResult))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminController
