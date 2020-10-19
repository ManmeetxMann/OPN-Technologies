import {Request, Response, Router} from 'express'

import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'

import {AppoinmentService} from '../services/appoinment.service'
import {AppointmentDTO, BarCodeGeneratorUI, AppoinmentDataUI} from '../models/appoinment'
import * as _ from 'lodash'

class PortalController implements IControllerBase {
  public path = '/admin'
  public router = Router()
  private appoinmentService = new AppoinmentService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.get(this.path + '/page/next-bar-code', this.displayNextBarCode)
    this.router.get(this.path + '/page/appointment-by-bar-code', this.displayFormToEnterBarCode)
    this.router.post(this.path + '/page/appointment-by-bar-code', this.displayFormToEnterBarCode)
    this.router.get(this.path + '/page/send-single-results', this.displayFormToSendSingleResults)

    this.router.get(this.path + '/js/print-label-library.js', this.displayPrintLibraryJs)
    this.router.get(this.path + '/js/print-label.js', this.displayPrintJs)
  }

  displayFormToEnterBarCode = async (req: Request, res: Response): Promise<void> => {
    const {barCode} = req.body
    const templateData: AppoinmentDataUI = {
      findAppoinmentTab: 'active',
      barCode: barCode,
    }
    try {
      if (_.isEmpty(barCode)) {
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
    res.render('send_single_form', {layout: 'results'})
  }
  
}

export default PortalController
