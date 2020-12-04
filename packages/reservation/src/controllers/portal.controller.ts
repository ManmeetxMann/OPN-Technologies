import {Request, Response, Router} from 'express'

import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import moment from 'moment-timezone'
import {isEmpty} from 'lodash'

import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {now} from '../../../common/src/utils/times'
import {Config} from '../../../common/src/utils/config'

import {AppoinmentService} from '../services/appoinment.service'

import {AppointmentDTO, BarCodeGeneratorUI, AppoinmentDataUI} from '../models/appoinment'

import {middlewareGenerator} from '../../../common/src/middlewares/basic-auth'

class PortalController implements IControllerBase {
  public path = ''
  public router = Router()
  private appoinmentService = new AppoinmentService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router()
      .get(this.path + '/page/next-bar-code', this.displayNextBarCode)
      .get(this.path + '/page/appointment-by-bar-code', this.displayFormToEnterBarCode)
      .post(this.path + '/page/appointment-by-bar-code', this.displayFormToEnterBarCode)
      .get(this.path + '/page/send-single-results', this.displayFormToSendSingleResults)
      .get(this.path + '/page/send-bulk-results', this.displayFormToSendBulkResults)
      .get(this.path + '/page/send-fax-for-positive', this.displayFormToSendFaxForPositive)
      .get(this.path + '/js/print-label-library.js', this.displayPrintLibraryJs)
      .get(this.path + '/js/print-label.js', this.displayPrintJs)

    this.router.use('/admin', middlewareGenerator(Config.get('RESERVATION_PASSWORD')), innerRouter)
  }

  displayFormToEnterBarCode = async (req: Request, res: Response): Promise<void> => {
    const {barCode} = req.body
    const templateData: AppoinmentDataUI = {
      findAppoinmentTab: 'active',
      barCode: barCode,
    }
    try {
      if (isEmpty(barCode)) {
        throw new BadRequestException('Please provide Bar Code Number')
      }
      const appointment: AppointmentDTO = await this.appoinmentService.getAppoinmentByBarCode(
        barCode,
      )
      templateData.appointment = appointment
    } catch (err) {
      templateData.invalidBarCodeNumber = true
    }

    res.render('bar_code_form', templateData)
  }

  displayNextBarCode = async (req: Request, res: Response): Promise<void> => {
    const templateData: BarCodeGeneratorUI = {
      getNextBarCodeTab: 'active',
    }

    try {
      const {newcode} = req.query
      if (newcode == '1') {
        templateData.barCode = await this.appoinmentService.getNextBarCodeNumber()
      }
    } catch (err) {
      console.log(`Failed to render ${err}`)
    }

    res.render('next_bar_code_number', templateData)
  }

  displayPrintJs = async (req: Request, res: Response): Promise<void> => {
    res.render('print_label_js', {layout: 'js'})
  }

  displayPrintLibraryJs = async (req: Request, res: Response): Promise<void> => {
    res.render('print_label_library_js', {layout: 'js'})
  }

  displayFormToSendSingleResults = async (req: Request, res: Response): Promise<void> => {
    const timeZone = Config.get('DEFAULT_TIME_ZONE')
    const calendarFromDate = moment(now()).tz(timeZone).subtract(30, 'days').format('YYYY-MM-DD')
    const calendarToDate = moment(now()).tz(timeZone).format('YYYY-MM-DD')

    res.render('send_single_form', {
      layout: 'results',
      confirmBeforeSend: Config.get('CONFIRM_BEFORE_SEND'),
      sendSingleResultsTab: true,
      calendarFromDate,
      calendarToDate,
    })
  }

  displayFormToSendBulkResults = async (req: Request, res: Response): Promise<void> => {
    const timeZone = Config.get('DEFAULT_TIME_ZONE')
    const calendarFromDate = moment(now()).tz(timeZone).subtract(30, 'days').format('YYYY-MM-DD')
    const calendarToDate = moment(now()).tz(timeZone).format('YYYY-MM-DD')

    res.render('send_bulk_form', {
      layout: 'results',
      sendBulkResultTab: true,
      calendarFromDate,
      calendarToDate,
    })
  }

  displayFormToSendFaxForPositive = async (req: Request, res: Response): Promise<void> => {
    res.render('send_fax_for_positive', {
      layout: 'results',
      confirmBeforeSend: Config.get('CONFIRM_BEFORE_SEND'),
      sendFaxForPositiveTab: true,
    })
  }
}

export default PortalController
